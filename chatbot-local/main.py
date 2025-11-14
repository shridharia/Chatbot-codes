from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Mount the static directory to serve files publicly
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_html(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
    
@app.get("/ia_chatbot_embed", response_class=HTMLResponse)
async def chatbot_embed(request: Request):
    return templates.TemplateResponse("ia_chatbot_embed.html", {"request": request})

from fastapi.responses import JSONResponse
from fastapi import Request

@app.post("/api/generate_captcha_token")
async def generate_captcha_token(request: Request):
    # Skip reCAPTCHA verification in development
    return JSONResponse({
        "message": "reCAPTCHA verification skipped in development mode.",
        "token": "dummy-dev-token"
    })

@app.post("/api/ia_chatbot")
async def ia_chatbot(request: Request):
    data = await request.json()
    user_input = data.get("userInput", "")
    # Dummy bot response
    return {"type": "text", "content": {"text": f"Echo: {user_input}"}}