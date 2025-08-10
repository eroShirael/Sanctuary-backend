import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({limit:"1mb"}));

// CORS: autoriser ton site GitHub Pages
app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin","https://eroshirael.github.io");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.sendStatus(200);
  next();
});

const GH_TOKEN = process.env.GITHUB_TOKEN;      // à mettre sur Render (secret)
const REPO     = process.env.REPO;              // "eroShirael/Sanctuary"
const BRANCH   = process.env.BRANCH || "main";  // "main"
const API      = "https://api.github.com";

async function getFileSha(path){
  const r = await fetch(`${API}/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,{
    headers:{ Authorization:`Bearer ${GH_TOKEN}`, "User-Agent":"sanctuary" }
  });
  if(r.status===404) return null;
  const j = await r.json();
  return j.sha || null;
}

// créer / remplacer un fichier dans ton site
app.post("/edit", async (req,res)=>{
  try{
    const { path, content, message } = req.body;
    if(!path || typeof content!=="string") return res.status(400).json({error:"path/content manquants"});

    const sha = await getFileSha(path);
    const body = {
      message: message || `Sanctuary edit: ${path}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: BRANCH,
      ...(sha ? { sha } : {})
    };

    const r = await fetch(`${API}/repos/${REPO}/contents/${encodeURIComponent(path)}`,{
      method:"PUT",
      headers:{ Authorization:`Bearer ${GH_TOKEN}`, "User-Agent":"sanctuary", "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });
    if(!r.ok){ return res.status(400).json({error: await r.text()}); }
    const out = await r.json();
    res.json({ ok:true, commit: out.commit?.sha });
  }catch(e){ res.status(500).json({error:e.message}); }
});

// Ping
app.get("/", (req,res)=> res.send("Sanctuary backend OK"));
app.listen(process.env.PORT || 3000, ()=> console.log("UP"));
