"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const prisma_1 = require("../prisma/prisma");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
let building = false;
const buildService = async (type, width, height, minWidth, minHeight, maxWidth, maxHeight, resizable, fullscreen, hideMenu, systemButton, centerWindow, posX, posY, alwaysOnTop, frameless, backgroundColor, title, versionWorker, nodeIntegration, contextIsolation, sandbox, devtools, hardwareAccel, name, version, description, author, licence, appId, startUrl, winLink, authNewWindow, blockWindowOpen, authHTTPS, authHTTP, authSubdom, redirectURLUnDom, domainBlacklist, domainWhitelist, chromiumFlags) => {
    try {
        if (building) {
            return { success: false, code: 409, error: "No worker available" };
        }
        let resultDb = await prisma_1.prisma.build.create({
            data: {
                type,
                appId,
                name,
                version,
                alwaysOnTop,
                author,
                backgroundColor,
                chromiumFlags,
                contextIsolation,
                description,
                devtools,
                frameless,
                hardwareAccel,
                maxHeight,
                fullscreen,
                height,
                license: licence,
                maxWidth,
                minHeight,
                minWidth,
                nodeIntegration,
                resizable,
                sandbox,
                startUrl,
                title,
                width,
                status: "BUILDING",
                redirectURLUnDom,
                versionWorker,
                authHTTP,
                authHTTPS,
                authNewWindow,
                authSubdom,
                blockWindowOpen,
                centerWindow,
                domainBlacklist,
                domainWhitelist,
                hideMenu,
                posX,
                posY,
                systemButton,
                winLink
            }
        });
        if (!resultDb)
            throw new Error("Error when pushing in DB");
        building = true;
        const worker = (0, node_child_process_1.spawn)("node", ["worker/build.worker.js", resultDb.id], { stdio: "inherit" });
        worker.on("close", (code) => {
            building = false;
            console.log("Build finished with code " + code);
        });
        worker.on("exit", (code) => {
            building = false;
            console.log("Build worker exited with code " + code);
        });
        worker.on("error", (error) => {
            building = false;
            console.error(error);
        });
        return { success: true, status: "Building", result: resultDb };
    }
    catch (error) {
        console.error(error);
        return { success: false, code: 500, error };
    }
};
const downloadBuild = async (id) => {
    try {
        const build = await prisma_1.prisma.build.findUnique({
            where: {
                id
            }
        });
        if (!build)
            return { success: false, error: "Build not found" };
        if (build.status !== "SUCCESS")
            return { success: false, error: "Build is not ready", status: build.status };
        if (!build.buildFile)
            return { success: false, error: "Build file not found" };
        const filePath = node_path_1.default.resolve(build.buildFile);
        if (!node_fs_1.default.existsSync(filePath))
            return { success: false, error: "Build file does not exist" };
        return { success: true, filePath };
    }
    catch (error) {
        return { success: false, error };
    }
};
const getStatusBuild = async (id) => {
    try {
        let build = await prisma_1.prisma.build.findUnique({
            where: { id }
        });
        if (!build)
            return { success: false, error: "Build not found" };
        let buildStatus = build.status;
        return { success: true, result: buildStatus };
    }
    catch (error) {
        console.error(error);
        return { success: false, error };
    }
};
exports.default = { buildService, downloadBuild, getStatusBuild };
