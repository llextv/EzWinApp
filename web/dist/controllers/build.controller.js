"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = __importDefault(require("zod"));
const build_service_1 = __importDefault(require("../services/build.service"));
const node_path_1 = __importDefault(require("node:path"));
const createBuildScheme = zod_1.default.object({
    type: zod_1.default.enum(["nsis", "portable", "msi"]).default("nsis"),
    width: zod_1.default.number().min(1).default(1280),
    height: zod_1.default.number().min(1).default(720),
    minWidth: zod_1.default.number().min(1).default(800),
    minHeight: zod_1.default.number().min(1).default(600),
    maxWidth: zod_1.default.number().min(1).default(1920),
    maxHeight: zod_1.default.number().min(1).default(1080),
    resizable: zod_1.default.boolean().default(true),
    fullscreen: zod_1.default.boolean().default(false),
    hideMenu: zod_1.default.boolean().default(false),
    systemButton: zod_1.default.boolean().default(true),
    centerWindow: zod_1.default.boolean().default(true),
    alwaysOnTop: zod_1.default.boolean().default(false),
    frameless: zod_1.default.boolean().default(false),
    backgroundColor: zod_1.default.string().default("#ffffff"),
    title: zod_1.default.string().min(3).max(255).default("My Electron App"),
    posX: zod_1.default.number().default(0),
    posY: zod_1.default.number().default(0),
    versionWorker: zod_1.default.string().default("1.0.0"),
    nodeIntegration: zod_1.default.boolean().default(false),
    contextIsolation: zod_1.default.boolean().default(true),
    sandbox: zod_1.default.boolean().default(true),
    devtools: zod_1.default.boolean().default(false),
    hardwareAccel: zod_1.default.boolean().default(true),
    chromiumFlags: zod_1.default.string().optional().default(""),
    name: zod_1.default.string().min(3).max(255).default("My Electron App"),
    version: zod_1.default.string().min(2).max(255).default("1.0.0"),
    description: zod_1.default.string().min(1).max(255).default("Electron application"),
    author: zod_1.default.string().min(1).max(255).default("Unknown"),
    licence: zod_1.default.string().min(1).max(255).default("MIT"),
    appId: zod_1.default.string().min(1).max(255).default("com.example.app"),
    startUrl: zod_1.default.url().default("https://example.com"),
    domainWhitelist: zod_1.default.string().max(255).optional().default(""),
    domainBlacklist: zod_1.default.string().max(255).optional().default(""),
    redirectURLUnDom: zod_1.default.url().default("https://example.com"),
    authSubdom: zod_1.default.boolean().default(false),
    authHTTP: zod_1.default.boolean().default(false),
    authHTTPS: zod_1.default.boolean().default(true),
    blockWindowOpen: zod_1.default.boolean().default(false),
    authNewWindow: zod_1.default.boolean().default(false),
    winLink: zod_1.default.boolean().default(true)
});
const idScheme = zod_1.default.uuidv4();
const createBuild = async (req, res) => {
    try {
        console.log(req.body);
        const data = createBuildScheme.parse(req.body);
        let result = await build_service_1.default.buildService(data.type, data.width, data.height, data.minWidth, data.minHeight, data.maxWidth, data.maxHeight, data.resizable, data.fullscreen, data.hideMenu, data.systemButton, data.centerWindow, data.posX, data.posY, data.alwaysOnTop, data.frameless, data.backgroundColor, data.title, data.versionWorker, data.nodeIntegration, data.contextIsolation, data.sandbox, data.devtools, data.hardwareAccel, data.name, data.version, data.description, data.author, data.licence, data.appId, data.startUrl, data.winLink, data.authNewWindow, data.blockWindowOpen, data.authHTTPS, data.authHTTP, data.authSubdom, data.redirectURLUnDom, data.domainBlacklist, data.domainWhitelist, data.chromiumFlags);
        if (!result.success) {
            if (result.code === 409)
                return res.status(509).json({ success: false, error: "No worker available, retry later" });
            return res.status(500).json({ success: false, error: result.error });
        }
        if (!result.result)
            return res.status(500).json({ success: false, error: "BuildID not found" });
        return res.status(200).json({ success: true, status: result.status, buildId: result.result.id });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error });
    }
};
const downloadBuild = async (req, res) => {
    try {
        const id = idScheme.parse(req.params.id);
        let result = await build_service_1.default.downloadBuild(id);
        if (!result.success)
            return res.status(500).json({ success: false, error: result.error });
        if (!result.filePath)
            return res.status(500).json({ success: false, error: "Unable to find file path" });
        return res.download(result.filePath, node_path_1.default.basename(result.filePath), (error) => {
            if (error) {
                console.error("Download error: ", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download build"
                    });
                }
            }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error });
    }
};
const getBuildStatus = async (req, res) => {
    try {
        const id = idScheme.parse(req.params.id);
        let result = await build_service_1.default.getStatusBuild(id);
        if (!result || !result.success)
            return res.status(500).json({ success: true, error: result.error });
        return res.status(200).json({ success: true, result: result.result });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error });
    }
};
exports.default = { createBuild, downloadBuild, getBuildStatus };
