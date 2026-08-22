const API_URL = "http://localhost:3000"
const POLLING_INTERVAL = 5000;
const MAX_POLLING_ATTEMPTS = 200; 

function sendNotif(type, name) {
  // switch(type){
  //   case "error": {alert("Error " + name)}
  //   case "info": {alert("Info: " + name)}
  //   default: throw new Error("Notif not found");
  // }
}

async function submit(type) {
  try {
    // Afficher la barre de chargement
    const loadingContainer = document.getElementById("loadingContainer");
    const progressBar = document.getElementById("progressBar");
    const statusMessage = document.getElementById("statusMessage");

    loadingContainer.style.display = "block";
    progressBar.style.width = "0%";
    statusMessage.textContent = "Preparing your build...";
    statusMessage.className = "status-message";

    let bodyFetch = {};

    // Tech options
    bodyFetch.type = type ?? "nsis";
    bodyFetch.width = Number(document.getElementById("Width").value);
    bodyFetch.height = Number(document.getElementById("Height").value);
    bodyFetch.minWidth = Number(document.getElementById("MinWidth").value);
    bodyFetch.minHeight = Number(document.getElementById("MinHeight").value);
    bodyFetch.maxWidth = Number(document.getElementById("MaxWidth").value);
    bodyFetch.maxHeight = Number(document.getElementById("MaxHeight").value);
    bodyFetch.resizable = document.getElementById("Resizable").checked;
    bodyFetch.fullscreen = document.getElementById("Fullscreen").checked;
    bodyFetch.alwaysOnTop = document.getElementById("AlwaysOnTop").checked;
    bodyFetch.frameless = document.getElementById("Frameless").checked;
    bodyFetch.hideMenu = document.getElementById("HideMenu").checked;
    bodyFetch.systemButton = document.getElementById("SystemButton").checked;
    bodyFetch.centerWindow = document.getElementById("CenterWindow").checked;
    bodyFetch.backgroundColor = document.getElementById("BackgroundColor").value;
    bodyFetch.title = document.getElementById("Title").value;
    bodyFetch.posX = Number(document.getElementById("PosX").value);
    bodyFetch.posY = Number(document.getElementById("PosY").value);

    // Worker options
    bodyFetch.version = "1.0.0";
    bodyFetch.nodeIntegration = document.getElementById("NodeInte").checked;
    bodyFetch.contextIsolation = document.getElementById("ContextIsolation").checked;
    bodyFetch.sandbox = document.getElementById("Sandbox").checked;
    bodyFetch.devtools = document.getElementById("devtools").checked;
    bodyFetch.hardwareAccel = document.getElementById("HardwareAccel").checked;
    bodyFetch.chromiumFlags = document.getElementById("ChromiumFlags").value;

    // App options
    bodyFetch.name = document.getElementById("Name").value;
    bodyFetch.version = document.getElementById("Version").value;
    bodyFetch.description = document.getElementById("Description").value;
    bodyFetch.author = document.getElementById("Author").value;
    bodyFetch.licence = document.getElementById("Licence").value;
    bodyFetch.appId = document.getElementById("AppId").value;
    bodyFetch.startUrl = document.getElementById("StartUrl").value;
    bodyFetch.domainWhitelist = document.getElementById("DomainWl").value;
    bodyFetch.domainBlacklist = document.getElementById("DomainBl").value;
    bodyFetch.redirectURLUnDom = document.getElementById("RedirectURLUnDom").value;
    bodyFetch.authSubdom = document.getElementById("authSubdom").checked;
    bodyFetch.authHTTP = document.getElementById("authHTTP").checked;
    bodyFetch.authHTTPS = document.getElementById("authHTTPS").checked;
    bodyFetch.blockWindowOpen = document.getElementById("winOpenBlock").checked;
    bodyFetch.authNewWindow = document.getElementById("winNewWin").checked;
    bodyFetch.winLink = document.getElementById("winLink").checked;

    bodyFetch.versionWorker = "v1";

    const response = await fetch(API_URL + "/api/v2/builds/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyFetch)
    });

    const result = await response.json();

    if (!result) throw new Error("Result not found");
    if (!result.success) throw new Error(result.error || "API returned an error");

    const buildId = result.buildId;
    if (!buildId) throw new Error("Build ID not found");

    progressBar.style.width = "30%";
    statusMessage.textContent = "Build submitted successfully. Waiting for completion...";

    await downloadBuild(buildId);

  } catch (error) {
    const loadingContainer = document.getElementById("loadingContainer");
    loadingContainer.style.display = "none";

    sendNotif("error", error.message || error);
    console.error(error);
  }
}

async function downloadBuild(buildId, attempt = 1) {
  const loadingContainer = document.getElementById("loadingContainer");
  const progressBar = document.getElementById("progressBar");
  const statusMessage = document.getElementById("statusMessage");

  try {
    const statusResponse = await fetch(API_URL + `/api/v2/builds/${encodeURIComponent(buildId)}/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
    });

    const statusResult = await statusResponse.json();

    if (!statusResult || !statusResult.success) {
      throw new Error(statusResult.error || "Failed to get build status");
    }

    const status = statusResult.result;

    if (status === "SUCCESS") {
      progressBar.style.width = "90%";
      statusMessage.textContent = "Build completed. Preparing download...";

      const downloadResponse = await fetch(API_URL + `/api/v2/builds/${encodeURIComponent(buildId)}/download`);

      if (!downloadResponse.ok) {
        const errorResult = await downloadResponse.json().catch(() => null);
        throw new Error(errorResult?.error || "Failed to download build");
      }

      const blob = await downloadResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = downloadResponse.headers.get("Content-Disposition");
      let filename = "build.exe";

      const match = disposition?.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      progressBar.style.width = "100%";
      statusMessage.textContent = "Build downloaded successfully!";
      statusMessage.className = "status-message success";

      sendNotif("info", "Download started");

    } else if (status === "ERROR") {
      throw new Error("Build failed");

    } else {
      progressBar.style.width = `${30 + (attempt * 2)}%`;
      if(status == "SCANNING"){
        statusMessage.textContent = `Scanning in progress...`;
      }else{
        statusMessage.textContent = `Build in progress...`;
      }
      

      if (attempt < MAX_POLLING_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        await downloadBuild(buildId, attempt + 1);
      } else {
        throw new Error("Build timeout");
      }
    }

  } catch (error) {
    loadingContainer.style.display = "block";
    progressBar.style.width = "0%";
    statusMessage.textContent = error.message || "An error occurred";
    statusMessage.className = "status-message error";

    sendNotif("error", error.message || error);
    console.error(error);
  }
}