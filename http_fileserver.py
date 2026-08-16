#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse
import os
import uvicorn

app = FastAPI(title="Chess Site Filesystem API")

@app.get("/read")
def read_file(path: str = Query(..., description="Chemin du fichier")):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return PlainTextResponse(f.read())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/write")
def write_file(path: str = Query(...), content: str = Query(...)):
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"status": "ok", "message": f"Fichier '{path}' mis à jour"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list")
def list_directory(path: str = Query(".", description="Chemin du dossier")):
    try:
        items = os.listdir(path)
        return {"items": items}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete")
def delete_file(path: str = Query(...)):
    try:
        if os.path.isfile(path):
            os.remove(path)
            return {"status": "ok", "message": f"Fichier '{path}' supprimé"}
        else:
            raise HTTPException(status_code=404, detail="Fichier introuvable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mkdir")
def create_directory(path: str = Query(...)):
    try:
        os.makedirs(path, exist_ok=True)
        return {"status": "ok", "message": f"Dossier '{path}' créé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
