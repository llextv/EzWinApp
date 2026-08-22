"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_child_process_1 = require("node:child_process");
const prisma_1 = require("../prisma/prisma");
const projectId = process.argv[2];
if (!projectId) {
    console.error("Missing project ID");
    process.exit(1);
}
const buildConfig = {
    nsis: {
        platform: "win",
        target: "nsis",
        extension: ".exe"
    },
    portable: {
        platform: "win",
        target: "portable",
        extension: ".exe"
    },
    msi: {
        platform: "win",
        target: "msi",
        extension: ".msi"
    },
    appimage: {
        platform: "linux",
        target: "AppImage",
        extension: ".AppImage"
    },
    deb: {
        platform: "linux",
        target: "deb",
        extension: ".deb"
    },
    rpm: {
        platform: "linux",
        target: "rpm",
        extension: ".rpm"
    }
};
function run(command, args, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`> ${command} ${args.join(" ")}`);
        const child = (0, node_child_process_1.spawn)(command, args, {
            cwd,
            shell: true,
            stdio: "inherit"
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });
    });
}
const VT_API = "https://www.virustotal.com/api/v3";
function getApiKey() {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) {
        throw new Error("VIRUSTOTAL_API_KEY is missing");
    }
    return apiKey;
}
const VT_API_KEY = getApiKey();
async function scanFile(filePath) {
    try {
        console.log(`Starting VirusTotal scan: ${filePath}`);
        const stat = await promises_1.default.stat(filePath);
        const maxDirectUpload = 32 * 1024 * 1024;
        let uploadUrl = `${VT_API}/files`;
        if (stat.size > maxDirectUpload) {
            console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
            const uploadUrlResponse = await fetch(`${VT_API}/files/upload_url`, {
                method: "GET",
                headers: {
                    "x-apikey": VT_API_KEY
                }
            });
            if (!uploadUrlResponse.ok) {
                const error = await uploadUrlResponse.text();
                throw new Error(`VirusTotal upload URL failed (${uploadUrlResponse.status}): ${error}`);
            }
            const uploadUrlData = await uploadUrlResponse.json();
            uploadUrl = uploadUrlData.data;
        }
        const fileBuffer = await promises_1.default.readFile(filePath);
        const file = new File([fileBuffer], node_path_1.default.basename(filePath));
        const form = new FormData();
        form.append("file", file);
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "x-apikey": VT_API_KEY
            },
            body: form
        });
        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            throw new Error(`VirusTotal upload failed (${uploadResponse.status}): ${error}`);
        }
        const upload = await uploadResponse.json();
        const analysisId = upload.data.id;
        console.log(`VirusTotal analysis started: ${analysisId}`);
        let status = "queued";
        for (let i = 0; i < 60; i++) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            const response = await fetch(`${VT_API}/analyses/${encodeURIComponent(analysisId)}`, {
                headers: {
                    "x-apikey": VT_API_KEY
                }
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`VirusTotal analysis failed (${response.status}): ${error}`);
            }
            const analysis = await response.json();
            status = analysis.data.attributes.status;
            console.log(`VirusTotal status: ${status}`);
            if (status === "completed")
                break;
        }
        if (status !== "completed") {
            throw new Error("VirusTotal analysis timeout");
        }
        const analysisResponse = await fetch(`${VT_API}/analyses/${encodeURIComponent(analysisId)}`, {
            headers: {
                "x-apikey": VT_API_KEY
            }
        });
        if (!analysisResponse.ok) {
            const error = await analysisResponse.text();
            throw new Error(`Unable to retrieve VirusTotal analysis: ${error}`);
        }
        const analysisData = await analysisResponse.json();
        const sha256 = analysisData.meta?.file_info?.sha256;
        if (!sha256) {
            throw new Error("VirusTotal did not return file SHA256");
        }
        const reportResponse = await fetch(`${VT_API}/files/${sha256}`, {
            headers: {
                "x-apikey": VT_API_KEY
            }
        });
        if (!reportResponse.ok) {
            const error = await reportResponse.text();
            throw new Error(`Unable to retrieve VirusTotal report: ${error}`);
        }
        const report = await reportResponse.json();
        const stats = report.data.attributes.last_analysis_stats;
        return {
            clean: stats.malicious === 0 && stats.suspicious === 0,
            malicious: stats.malicious,
            suspicious: stats.suspicious,
            harmless: stats.harmless,
            undetected: stats.undetected,
            timeout: stats.timeout,
            sha256
        };
    }
    catch (error) {
        console.error("VirusTotal error:", error);
        throw new Error(`VirusTotal scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function main() {
    const tempDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), `electron-build-${projectId}-`));
    try {
        console.log(`Starting build for ${projectId}`);
        console.log(`Temporary directory: ${tempDir}`);
        const project = await prisma_1.prisma.build.findUnique({
            where: {
                id: projectId
            }
        });
        if (!project)
            throw new Error("Build project not found");
        await prisma_1.prisma.build.update({
            where: {
                id: projectId
            },
            data: {
                status: "BUILDING",
                startedAt: new Date(),
                error: null
            }
        });
        const target = buildConfig[project.type];
        if (!target)
            throw new Error(`Unsupported build type: ${project.type}`);
        await promises_1.default.copyFile(node_path_1.default.resolve("assets/icon.ico"), node_path_1.default.join(tempDir, "icon.ico"));
        const packageJson = {
            name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            version: project.version,
            main: "main.js",
            scripts: {
                start: "electron ."
            },
            devDependencies: {
                electron: "^43.4.1",
                "electron-builder": "^26.15.3"
            },
            build: {
                appId: project.appId,
                productName: project.name,
                ...(target.platform === "win" ? {
                    win: {
                        target: target.target,
                        icon: "icon.ico"
                    }
                } : {
                    linux: {
                        target: target.target,
                        icon: "icon.png"
                    }
                })
            }
        };
        await promises_1.default.writeFile(node_path_1.default.join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));
        const mainJs = `
      const { app, BrowserWindow, Menu } = require("electron");
      
      const domainWhitelist = ${JSON.stringify(project.domainWhitelist ?? "")};
      const domainBlacklist = ${JSON.stringify(project.domainBlacklist ?? "")};
      const redirectURLUnDom = ${JSON.stringify(project.redirectURLUnDom)};
      const authSubdom = ${project.authSubdom};
      const authHTTP = ${project.authHTTP};
      const authHTTPS = ${project.authHTTPS};
      const blockWindowOpen = ${project.blockWindowOpen};
      const authNewWindow = ${project.authNewWindow};
      const winLink = ${project.winLink};
      
      const whitelist = domainWhitelist
        .split(",")
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean);
      
      const blacklist = domainBlacklist
        .split(",")
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean);
      
      function getDomain(url) {
        try {
          return new URL(url).hostname.toLowerCase();
        } catch {
          return null;
        }
      }
      
      function isDomainAllowed(url) {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
      
        if(parsedUrl.protocol === "http:" && !authHTTP){
          return false;
        }
      
        if(parsedUrl.protocol === "https:" && !authHTTPS){
          return false;
        }
      
        const isBlacklisted = blacklist.some(domain => {
          if(authSubdom){
            return hostname === domain || hostname.endsWith("." + domain);
          }
      
          return hostname === domain;
        });
      
        if(isBlacklisted){
          return false;
        }
      
        if(whitelist.length === 0){
          return true;
        }
      
        return whitelist.some(domain => {
          if(authSubdom){
            return hostname === domain || hostname.endsWith("." + domain);
          }
      
          return hostname === domain;
        });
      }
      
      function getRedirectURL(url) {
        try {
          const redirect = new URL(redirectURLUnDom);
          redirect.searchParams.set("url", url);
          return redirect.toString();
        } catch {
          return redirectURLUnDom;
        }
      }
      
      function createWindow() {
        const win = new BrowserWindow({
          width: ${project.width},
          height: ${project.height},
      
          minWidth: ${project.minWidth ?? "undefined"},
          minHeight: ${project.minHeight ?? "undefined"},
      
          maxWidth: ${project.maxWidth ?? "undefined"},
          maxHeight: ${project.maxHeight ?? "undefined"},
      
          resizable: ${project.resizable},
          fullscreen: ${project.fullscreen},
          alwaysOnTop: ${project.alwaysOnTop},
      
          frame: ${!project.frameless},
      
          backgroundColor: ${JSON.stringify(project.backgroundColor)},
          title: ${JSON.stringify(project.title ?? project.name)},
      
          x: ${project.posX},
          y: ${project.posY},
      
          autoHideMenuBar: ${project.hideMenu},
      
          webPreferences: {
            nodeIntegration: ${project.nodeIntegration},
            contextIsolation: ${project.contextIsolation},
            sandbox: ${project.sandbox},
            devTools: ${project.devtools}
          }
        });
      
        if(${project.hideMenu}){
          Menu.setApplicationMenu(null);
        }
      
        if(${project.centerWindow}){
          win.center();
        }
      
        if(${project.posX} !== 0 || ${project.posY} !== 0){
          win.setPosition(${project.posX}, ${project.posY});
        }
      
        win.webContents.on("will-navigate", (event, url) => {
          if(isDomainAllowed(url)){
            return;
          }
      
          event.preventDefault();
      
          if(redirectURLUnDom){
            win.loadURL(getRedirectURL(url));
          }
        });
      
        win.webContents.setWindowOpenHandler(({ url }) => {
          if(blockWindowOpen){
            if(redirectURLUnDom){
              win.loadURL(getRedirectURL(url));
            }
      
            return {
              action: "deny"
            };
          }
      
          if(!isDomainAllowed(url)){
            if(redirectURLUnDom){
              win.loadURL(getRedirectURL(url));
            }
      
            return {
              action: "deny"
            };
          }
      
          if(!authNewWindow){
            if(winLink){
              win.loadURL(url);
            }
      
            return {
              action: "deny"
            };
          }
      
          return {
            action: "allow"
          };
        });
      
        win.loadURL(${JSON.stringify(project.startUrl)});
      
        return win;
      }
      
      app.whenReady().then(() => {
        createWindow();
      });
      
      app.on("window-all-closed", () => {
        if(process.platform !== "darwin"){
          app.quit();
        }
      });
    `;
        await promises_1.default.writeFile(node_path_1.default.join(tempDir, "main.js"), mainJs);
        await run("npm", ["install"], tempDir);
        if (target.platform === "win") {
            await run("npx", ["electron-builder", "--win"], tempDir);
        }
        else {
            await run("npx", ["electron-builder", "--linux"], tempDir);
        }
        const distDir = node_path_1.default.join(tempDir, "dist");
        const files = await promises_1.default.readdir(distDir);
        console.log("Build files:", files);
        const exeFile = files.find((file) => file.endsWith(target.extension));
        if (!exeFile)
            throw new Error(`No ${target.extension} file found`);
        const buildsDir = node_path_1.default.resolve("builds", projectId);
        await promises_1.default.mkdir(buildsDir, { recursive: true });
        const sourcePath = node_path_1.default.join(distDir, exeFile);
        await prisma_1.prisma.build.update({
            where: {
                id: projectId
            },
            data: {
                status: "SCANNING"
            }
        });
        const virusTotalResult = await scanFile(sourcePath);
        if (!virusTotalResult.clean)
            throw new Error(`VirusTotal detected threats: ` + `${virusTotalResult.malicious} malicious, ` + `${virusTotalResult.suspicious} suspicious`);
        const destinationPath = node_path_1.default.join(buildsDir, exeFile);
        const relativePath = node_path_1.default.join("builds", projectId, exeFile);
        await promises_1.default.copyFile(sourcePath, destinationPath);
        await prisma_1.prisma.build.update({
            where: {
                id: projectId
            },
            data: {
                status: "SUCCESS",
                buildFile: relativePath,
                finishedAt: new Date()
            }
        });
        console.log(`Build copied to ${destinationPath}`);
        console.log("Build completed successfully!");
    }
    catch (error) {
        console.error("BUILD FAILED");
        console.error(error);
        try {
            await prisma_1.prisma.build.update({
                where: {
                    id: projectId
                },
                data: {
                    status: "FAILED",
                    error: error instanceof Error ? error.message : String(error),
                    finishedAt: new Date()
                }
            });
        }
        catch (dbError) {
            console.error("Could not update build status:", dbError);
        }
        process.exitCode = 1;
    }
    finally {
        await promises_1.default.rm(tempDir, { recursive: true, force: true });
        console.log("Temporary files removed.");
    }
}
main().then(async () => {
    await prisma_1.prisma.$disconnect();
    process.exit(0);
}).catch(async (error) => {
    console.error(error);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
