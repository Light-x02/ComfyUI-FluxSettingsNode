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
            if (originalOnNodeCreated) {
                originalOnNodeCreated.apply(this, arguments);
            }

            // Ensure widgets are defined
            const widgetDefaults = { value: null, callback: null };
            this.guidanceWidget = this.widgets[0] || widgetDefaults; // guidance corresponds to widget[0]
            this.samplerWidget = this.widgets[1] || widgetDefaults; // sampler_name corresponds to widget[1]
            this.schedulerWidget = this.widgets[2] || widgetDefaults; // scheduler corresponds to widget[2]
            this.stepsWidget = this.widgets[3] || widgetDefaults; // steps corresponds to widget[3]
            this.denoiseWidget = this.widgets[4] || widgetDefaults; // denoise corresponds to widget[4]

            // Initialize tab state and content
            this.activeTab = 0;
            this.tabContents = TAB_CONFIG.labels.map(() => ({
                guidance: 3.5,
                sampler_name: "euler",
                scheduler: "normal",
                steps: 20,
                denoise: 1.0
            }));

            // Add change listeners to widgets
            this.guidanceWidget.callback = () => {
                console.log(`Tab ${this.activeTab}: Saving guidance =`, this.guidanceWidget.value);
                this.tabContents[this.activeTab].guidance = this.guidanceWidget.value;
            };

            this.samplerWidget.callback = () => {
                console.log(`Tab ${this.activeTab}: Saving sampler_name =`, this.samplerWidget.value);
                this.tabContents[this.activeTab].sampler_name = this.samplerWidget.value;
            };

            this.schedulerWidget.callback = () => {
                this.tabContents[this.activeTab].scheduler = this.schedulerWidget.value;
            };

            this.stepsWidget.callback = () => {
                this.tabContents[this.activeTab].steps = this.stepsWidget.value;
            };

            this.denoiseWidget.callback = () => {
                this.tabContents[this.activeTab].denoise = this.denoiseWidget.value;
            };
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (originalOnDrawForeground) {
                originalOnDrawForeground.apply(this, arguments);
            }

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

            // Check if the click is outside the tab area
            if (y < yPosition || y > yPosition + height) {
                return false; // Allow other events like zoom or pan
            }

            for (let i = 0; i < labels.length; i++) {
                const tabX = offset + (width + spacing) * i;
                if (x >= tabX && x <= tabX + width) {
                    if (i === this.activeTab) return false;

                    console.log(`Before switching tabs - Tab ${this.activeTab} content:`, this.tabContents[this.activeTab]);

                    // Save current widget values to current tab
                    this.tabContents[this.activeTab] = {
                        guidance: this.guidanceWidget?.value ?? 3.5,
                        sampler_name: this.samplerWidget?.value ?? "euler",
                        scheduler: this.schedulerWidget?.value ?? "normal",
                        steps: this.stepsWidget?.value ?? 20,
                        denoise: this.denoiseWidget?.value ?? 1.0
                    };

                    console.log(`Saved values for Tab ${this.activeTab}:`, this.tabContents[this.activeTab]);

                    // Switch tab
                    this.activeTab = i;

                    // Load content from new tab
                    const newTabContent = this.tabContents[i] || {};
                    console.log(`Loading values for Tab ${i}:`, newTabContent);
                    this.guidanceWidget.value = newTabContent.guidance ?? 3.5;
                    this.samplerWidget.value = newTabContent.sampler_name ?? "euler";
                    this.schedulerWidget.value = newTabContent.scheduler ?? "normal";
                    this.stepsWidget.value = newTabContent.steps ?? 20;
                    this.denoiseWidget.value = newTabContent.denoise ?? 1.0;

                    this.setDirtyCanvas(true);
                    return true;
                }
            }

            return false;
        };

        nodeType.prototype.getBounding = function () {
            const bounds = originalGetBounding ? originalGetBounding.apply(this, arguments) : [0, 0, 200, 300];
            const tabsHeight = Math.abs(TAB_CONFIG.yPosition) + TAB_CONFIG.height;
            bounds[1] -= tabsHeight; // Extend top boundary to include tabs
            bounds[3] += 100; // Drastically increase height to force alignment
            return bounds;
        };

        nodeType.prototype.onSerialize = function (o) {
            if (originalOnSerialize) {
                originalOnSerialize.apply(this, arguments);
            }
            o.tabContents = this.tabContents;
            o.activeTab = this.activeTab;
        };

        nodeType.prototype.onConfigure = function (o) {
            if (originalOnConfigure) {
                originalOnConfigure.apply(this, arguments);
            }
            if (o.tabContents && Array.isArray(o.tabContents)) {
                this.tabContents = TAB_CONFIG.labels.map((_, i) =>
                    o.tabContents[i] || {
                        guidance: 3.5,
                        sampler_name: "euler",
                        scheduler: "normal",
                        steps: 20,
                        denoise: 1.0
                    }
                );
                this.activeTab = o.activeTab >= 0 && o.activeTab < TAB_CONFIG.labels.length ? o.activeTab : 0;

                const currentTabContent = this.tabContents[this.activeTab];
                console.log(`Restoring Tab ${this.activeTab} Content:`, currentTabContent);
                if (this.guidanceWidget && this.samplerWidget && this.schedulerWidget && this.stepsWidget && this.denoiseWidget) {
                    this.guidanceWidget.value = currentTabContent.guidance ?? 3.5;
                    this.samplerWidget.value = currentTabContent.sampler_name ?? "euler";
                    this.schedulerWidget.value = currentTabContent.scheduler ?? "normal";
                    this.stepsWidget.value = currentTabContent.steps ?? 20;
                    this.denoiseWidget.value = currentTabContent.denoise ?? 1.0;
                }
            }
        };
    }
});
