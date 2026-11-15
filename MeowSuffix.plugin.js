/**
 * @name MeowSuffix
 * @author You
 * @description 发送消息时自动在末尾加上后缀（默认“喵”），可在设置里修改。
 * @version 1.0.0
 */

const PLUGIN_NAME = "MeowSuffix";
const DEFAULTS = { enabled: true, suffix: "喵", addSpace: false };

module.exports = class MeowSuffix {
    constructor() {
        this.settings = { ...DEFAULTS };
    }

    start() {
        this.loadSettings();
        const MessageActions = BdApi.Webpack.getByKeys("sendMessage", "editMessage");
        if (!MessageActions) {
            BdApi.UI.showToast("MeowSuffix：找不到发送消息的模块", { type: "error" });
            return;
        }
        BdApi.Patcher.before(PLUGIN_NAME, MessageActions, "sendMessage", (_t, args) => {
            const message = args[1];
            if (!message || typeof message.content !== "string") return;
            message.content = this.transform(message.content);
        });
    }

    stop() {
        BdApi.Patcher.unpatchAll(PLUGIN_NAME);
    }

    transform(content) {
        const { enabled, suffix, addSpace } = this.settings;
        if (!enabled || !suffix) return content;
        const text = content.trimEnd();
        if (!text) return content;
        if (text.startsWith("/")) return content;
        if (text.endsWith("```")) return content;
        if (text.endsWith(suffix)) return content;
        const endsWithUrl = /https?:\/\/\S+$/.test(text);
        return text + (addSpace || endsWithUrl ? " " : "") + suffix;
    }

    loadSettings() {
        const saved = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        this.settings = { ...DEFAULTS, ...saved };
    }

    saveSettings() {
        BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
    }

    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: [
                { type: "switch", id: "enabled", name: "启用", value: this.settings.enabled },
                { type: "text", id: "suffix", name: "后缀内容", note: "例如：喵、~、nya", value: this.settings.suffix },
                { type: "switch", id: "addSpace", name: "后缀前加空格", value: this.settings.addSpace }
            ],
            onChange: (_c, id, value) => {
                this.settings[id] = value;
                this.saveSettings();
            }
        });
    }
};
