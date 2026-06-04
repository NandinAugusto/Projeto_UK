from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routers import crime_skill, force_skill, neighbourhood_skill, stop_and_search_skill
import httpx

app = FastAPI(
    title="UK Police Analytics Library API",
    description="A comprehensive Python backend mapping the entire UK Police API for our dashboard",
    version="2.0.0"
)

# CORS configuration to allow the frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Skills (Routers)
app.include_router(crime_skill.router, prefix="/api/crimes", tags=["Crime Analytics"])
app.include_router(force_skill.router, prefix="/api/forces", tags=["Force Directory"])
app.include_router(neighbourhood_skill.router, prefix="/api/neighbourhoods", tags=["Neighbourhood Insights"])
app.include_router(stop_and_search_skill.router, prefix="/api/stop-and-search", tags=["Stop & Search Analytics"])

@app.get("/")
async def root():
    return {"message": "Welcome to the UK Police Analytics Library API. Visit /docs for the Swagger UI."}
