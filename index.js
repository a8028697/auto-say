(function () {
  "use strict";

  const DEFAULT_SUFFIX = "喵";

  const { before } = vendetta.patcher;
  const { findByProps } = vendetta.metro;

  const unpatches = [];

  // 读取插件设置里保存的结尾文字
  function readStored() {
    try {
      const s = vendetta.plugin.storage.suffix;
      return typeof s === "string" ? s : "";
    } catch (e) {
      return "";
    }
  }

  // 留空就用默认的“喵”
  function getSuffix() {
    return readStored() || DEFAULT_SUFFIX;
  }

  function addSuffix(msg) {
    if (!msg || typeof msg.content !== "string") return;

    const suffix = getSuffix();
    const text = msg.content.trimEnd();
    if (!text) return; // 没有文字（比如只发图片、贴纸）就不加

    // 已经以这个结尾（后面跟标点或 ~ 也算）就不重复加
    const stripped = text.replace(/[\s~～!！?？.。…,，、]+$/, "");
    if (text.endsWith(suffix) || stripped.endsWith(suffix)) return;

    // 以代码块或链接结尾时先隔开，避免破坏格式、或让结尾变成链接的一部分
    let sep = "";
    if (text.endsWith("```")) sep = "\n";
    else if (/https?:\/\/\S+$/i.test(text)) sep = " ";

    msg.content = text + sep + suffix;
  }

  function patch(name, obj, getMessage) {
    if (!obj || typeof obj[name] !== "function") return;
    try {
      unpatches.push(before(name, obj, (args) => addSuffix(getMessage(args))));
    } catch (e) {
      console.error("[自动加喵] 打补丁失败：", name, e);
    }
  }

  // 插件设置页：在这里直接改结尾文字
  function Settings() {
    const { React, ReactNative: RN } = vendetta.metro.common;
    const Forms = (vendetta.ui && vendetta.ui.components && vendetta.ui.components.Forms) || {};
    const h = React.createElement;
    const [value, setValue] = React.useState(() => getSuffix());

    const onChange = (v) => {
      const text = typeof v === "string" ? v : (v && v.nativeEvent && v.nativeEvent.text) || "";
      setValue(text);
      try {
        vendetta.plugin.storage.suffix = text;
      } catch (e) {}
    };

    const hint =
      "留空则使用默认的“" + DEFAULT_SUFFIX + "”，改完立刻生效，不用重启。\n效果：你好" + (value || DEFAULT_SUFFIX);

    return h(
      RN.ScrollView,
      { keyboardShouldPersistTaps: "handled" },
      Forms.FormInput
        ? h(Forms.FormInput, { title: "结尾文字", placeholder: DEFAULT_SUFFIX, value: value, onChange: onChange })
        : h(RN.TextInput, {
            value: value,
            placeholder: DEFAULT_SUFFIX,
            placeholderTextColor: "#80848e",
            onChangeText: onChange,
            style: { margin: 16, padding: 12, borderRadius: 8, color: "#fff", backgroundColor: "#2b2d31" },
          }),
      Forms.FormText
        ? h(Forms.FormText, { style: { marginHorizontal: 16, marginTop: 8 } }, hint)
        : h(RN.Text, { style: { margin: 16, color: "#b5bac1" } }, hint)
    );
  }

  return {
    onLoad() {
      // 普通发送
      patch("sendMessage", findByProps("sendMessage", "editMessage"), (args) => args[1]);
      // 带附件发送（文字说明在 parsedMessage 里）
      patch("uploadLocalFiles", findByProps("uploadLocalFiles"), (args) => args[0] && args[0].parsedMessage);
    },
    onUnload() {
      for (const unpatch of unpatches) unpatch();
      unpatches.length = 0;
    },
    settings: Settings,
  };
})()
