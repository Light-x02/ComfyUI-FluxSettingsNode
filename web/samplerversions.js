import { app } from "../../../scripts/app.js";

// Configuration Constants
const TAB_CONFIG = {
    width: 40,
    height: 15,
    fontSize: 10,
    normalColor: "#0d0d0d",
    selectedColor: "#666666",
    textColor: "white",
    borderRadius: 4,
    spacing: 10,
    offset: 16,
    xOffset: -9, // Add xOffset for horizontal adjustment
    labels: ["1", "2", "3", "4", "5", "6"], // 6 tabs
    yPosition: -5
};

const DEFAULT_TAB_CONTENT = {
    guidance: 3.5,
    sampler_name: "euler",
    scheduler: "normal",
    steps: 20,
    denoise: 1.0
};

function saveTabContent(context, tabIndex) {
    context.tabContents[tabIndex] = {
        guidance: context.guidanceWidget?.value ?? DEFAULT_TAB_CONTENT.guidance,
        sampler_name: context.samplerWidget?.value ?? DEFAULT_TAB_CONTENT.sampler_name,
        scheduler: context.schedulerWidget?.value ?? DEFAULT_TAB_CONTENT.scheduler,
        steps: context.stepsWidget?.value ?? DEFAULT_TAB_CONTENT.steps,
        denoise: context.denoiseWidget?.value ?? DEFAULT_TAB_CONTENT.denoise
    };
}

function loadTabContent(context, tabIndex) {
    const content = context.tabContents[tabIndex] || {};
    context.guidanceWidget.value = content.guidance ?? DEFAULT_TAB_CONTENT.guidance;
    context.samplerWidget.value = content.sampler_name ?? DEFAULT_TAB_CONTENT.sampler_name;
    context.schedulerWidget.value = content.scheduler ?? DEFAULT_TAB_CONTENT.scheduler;
    context.stepsWidget.value = content.steps ?? DEFAULT_TAB_CONTENT.steps;
    context.denoiseWidget.value = content.denoise ?? DEFAULT_TAB_CONTENT.denoise;
}

function initializeWidgets(node, widgetNames) {
    return widgetNames.map((name, index) => node.widgets[index] || { value: null, callback: null });
}

app.registerExtension({
    name: "FluxSettingsNode",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeType.comfyClass !== "FluxSettingsNode") return;

        // Preserve original methods
        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
        const originalGetBounding = nodeType.prototype.getBounding;
        const originalOnSerialize = nodeType.prototype.onSerialize;
        const originalOnConfigure = nodeType.prototype.onConfigure;

        nodeType.prototype.onNodeCreated = function () {
            if (originalOnNodeCreated) originalOnNodeCreated.apply(this, arguments);

            // Initialize widgets
            [this.guidanceWidget, this.samplerWidget, this.schedulerWidget, this.stepsWidget, this.denoiseWidget] = initializeWidgets(this, [
                "guidance",
                "sampler_name",
                "scheduler",
                "steps",
                "denoise"
            ]);

            // Initialize tab state and content
            this.activeTab = 0;
            this.tabContents = TAB_CONFIG.labels.map(() => ({ ...DEFAULT_TAB_CONTENT }));

            // Define widget callbacks
            this.guidanceWidget.callback = () => saveTabContent(this, this.activeTab);
            this.samplerWidget.callback = () => saveTabContent(this, this.activeTab);
            this.schedulerWidget.callback = () => saveTabContent(this, this.activeTab);
            this.stepsWidget.callback = () => saveTabContent(this, this.activeTab);
            this.denoiseWidget.callback = () => saveTabContent(this, this.activeTab);
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (originalOnDrawForeground) originalOnDrawForeground.apply(this, arguments);
            if (this.flags.collapsed) return;

            ctx.save();

            // Draw tabs
            TAB_CONFIG.labels.forEach((label, i) => {
                const x = TAB_CONFIG.xOffset + TAB_CONFIG.offset + (TAB_CONFIG.width + TAB_CONFIG.spacing) * i;
                const y = TAB_CONFIG.yPosition;

                // Draw tab background
                ctx.fillStyle = i === this.activeTab ? TAB_CONFIG.selectedColor : TAB_CONFIG.normalColor;
                ctx.beginPath();
                ctx.roundRect(x, y, TAB_CONFIG.width, TAB_CONFIG.height, TAB_CONFIG.borderRadius);
                ctx.fill();

                // Draw tab text
                ctx.fillStyle = TAB_CONFIG.textColor;
                ctx.font = `${TAB_CONFIG.fontSize}px Arial`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, x + TAB_CONFIG.width / 2, y + TAB_CONFIG.height / 2);
            });

            ctx.restore();
        };

        nodeType.prototype.onMouseDown = function (event, local_pos, graphCanvas) {
            const [x, y] = local_pos;
            const { yPosition, height, width, spacing, offset, labels } = TAB_CONFIG;

            if (y < yPosition || y > yPosition + height) return false;

            const clickedTabIndex = Math.floor((x - offset) / (width + spacing));
            if (
                clickedTabIndex < 0 ||
                clickedTabIndex >= labels.length ||
                clickedTabIndex === this.activeTab
            )
                return false;

            console.log(`Before switching tabs - Tab ${this.activeTab} content:`, this.tabContents[this.activeTab]);

            saveTabContent(this, this.activeTab);
            this.activeTab = clickedTabIndex;
            console.log(`Loading values for Tab ${this.activeTab}:`, this.tabContents[this.activeTab]);
            loadTabContent(this, this.activeTab);

            this.setDirtyCanvas(true);
            return true;
        };

        nodeType.prototype.getBounding = function () {
            const bounds = originalGetBounding ? originalGetBounding.apply(this, arguments) : [0, 0, 200, 300];
            const tabsHeight = Math.abs(TAB_CONFIG.yPosition) + TAB_CONFIG.height;
            bounds[1] -= tabsHeight;
            bounds[3] += 100;
            return bounds;
        };

        nodeType.prototype.onSerialize = function (o) {
            if (originalOnSerialize) originalOnSerialize.apply(this, arguments);
            o.tabContents = this.tabContents;
            o.activeTab = this.activeTab;
        };

        nodeType.prototype.onConfigure = function (o) {
            if (originalOnConfigure) originalOnConfigure.apply(this, arguments);

            if (o.tabContents && Array.isArray(o.tabContents)) {
                this.tabContents = TAB_CONFIG.labels.map((_, i) => o.tabContents[i] || { ...DEFAULT_TAB_CONTENT });
                this.activeTab = Math.min(Math.max(o.activeTab || 0, 0), TAB_CONFIG.labels.length - 1);
                loadTabContent(this, this.activeTab);
            }
        };
    }
});
