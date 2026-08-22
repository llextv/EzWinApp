import { Request, response, Response } from "express";
import z, { success } from "zod";
import buildService from "../services/build.service";
import path from "node:path";

const createBuildScheme = z.object({
  type: z.enum(["nsis", "portable", "msi"]).default("nsis"),
  width: z.number().min(1).default(1280),
  height: z.number().min(1).default(720),
  minWidth: z.number().min(1).default(800),
  minHeight: z.number().min(1).default(600),
  maxWidth: z.number().min(1).default(1920),
  maxHeight: z.number().min(1).default(1080),

  resizable: z.boolean().default(true),
  fullscreen: z.boolean().default(false),
  hideMenu: z.boolean().default(false),
  systemButton: z.boolean().default(true),
  centerWindow: z.boolean().default(true),
  alwaysOnTop: z.boolean().default(false),
  frameless: z.boolean().default(false),
  backgroundColor: z.string().default("#ffffff"),
  title: z.string().min(3).max(255).default("My Electron App"),
  posX: z.number().default(0),
  posY: z.number().default(0),
  versionWorker: z.string().default("1.0.0"),

  nodeIntegration: z.boolean().default(false),
  contextIsolation: z.boolean().default(true),
  sandbox: z.boolean().default(true),
  devtools: z.boolean().default(false),
  hardwareAccel: z.boolean().default(true),
  chromiumFlags: z.string().optional().default(""),

  name: z.string().min(3).max(255).default("My Electron App"),
  version: z.string().min(2).max(255).default("1.0.0"),
  description: z.string().min(1).max(255).default("Electron application"),
  author: z.string().min(1).max(255).default("Unknown"),
  licence: z.string().min(1).max(255).default("MIT"),
  appId: z.string().min(1).max(255).default("com.example.app"),
  startUrl: z.url().default("https://example.com"),
  domainWhitelist: z.string().max(255).optional().default(""),
  domainBlacklist: z.string().max(255).optional().default(""),

  redirectURLUnDom: z.url().default("https://example.com"),
  authSubdom: z.boolean().default(false),
  authHTTP: z.boolean().default(false),
  authHTTPS: z.boolean().default(true),
  blockWindowOpen: z.boolean().default(false),
  authNewWindow: z.boolean().default(false),
  winLink: z.boolean().default(true)
});

const idScheme = z.uuidv4();

const createBuild = async(req: Request, res: Response) => {
  try{
    console.log(req.body);
    const data = createBuildScheme.parse(req.body);
    let result = await buildService.buildService(data.type, data.width, data.height, data.minWidth, data.minHeight, data.maxWidth, data.maxHeight, data.resizable, data.fullscreen, data.hideMenu, data.systemButton, data.centerWindow, data.posX, data.posY, data.alwaysOnTop, data.frameless, data.backgroundColor, data.title, data.versionWorker, data.nodeIntegration, data.contextIsolation, data.sandbox, data.devtools, data.hardwareAccel, data.name, data.version, data.description, data.author, data.licence, data.appId, data.startUrl, data.winLink, data.authNewWindow, data.blockWindowOpen, data.authHTTPS, data.authHTTP, data.authSubdom, data.redirectURLUnDom, data.domainBlacklist, data.domainWhitelist, data.chromiumFlags );
    if(!result.success){
      if(result.code === 409) return res.status(509).json({success: false, error: "No worker available, retry later"})
      return res.status(500).json({success: false, error: result.error});
    }
    if(!result.result) return res.status(500).json({success: false, error: "BuildID not found"});
    return res.status(200).json({success: true, status: result.status, buildId: result.result.id});
  }catch(error){
    console.error(error);
    return res.status(500).json({success: false, error});
  }
}

const downloadBuild = async(req: Request, res: Response) => {
  try{
    const id = idScheme.parse(req.params.id);
    
    let result = await buildService.downloadBuild(id);
    if(!result.success) return res.status(500).json({success: false, error: result.error});
    if(!result.filePath) return res.status(500).json({success: false, error: "Unable to find file path"})

    return res.download(result.filePath, path.basename(result.filePath), (error) => {
      if(error){
        console.error("Download error: ", error);

        if(!res.headersSent){
          res.status(500).json({
            success: false,
            error: "Failed to download build"
          })
        }
      }
    })
  }catch(error){
    console.error(error);
    return res.status(500).json({success: false, error});
  }
}

const getBuildStatus = async(req: Request, res: Response) => {
  try {
    const id = idScheme.parse(req.params.id);

    let result = await buildService.getStatusBuild(id);
    if(!result || !result.success) return res.status(500).json({success: true, error: result.error});

    return res.status(200).json({success: true, result: result.result});
  }catch(error){
    console.error(error);
    return res.status(500).json({success: false, error});
  }
}

export default {createBuild, downloadBuild, getBuildStatus}