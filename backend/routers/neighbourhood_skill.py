from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()
BASE_URL = "https://data.police.uk/api"

@router.get("/{force_id}/neighbourhoods")
async def get_neighbourhoods(force_id: str):
    url = f"{BASE_URL}/{force_id}/neighbourhoods"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/locate")
async def locate_neighbourhood(lat: str, lng: str):
    url = f"{BASE_URL}/locate-neighbourhood?q={lat},{lng}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Not found")
        return response.json()

@router.get("/{force_id}/{neighbourhood_id}")
async def get_specific_neighbourhood(force_id: str, neighbourhood_id: str):
    url = f"{BASE_URL}/{force_id}/{neighbourhood_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/{force_id}/{neighbourhood_id}/boundary")
async def get_neighbourhood_boundary(force_id: str, neighbourhood_id: str):
    url = f"{BASE_URL}/{force_id}/{neighbourhood_id}/boundary"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/{force_id}/{neighbourhood_id}/team")
async def get_neighbourhood_team(force_id: str, neighbourhood_id: str):
    url = f"{BASE_URL}/{force_id}/{neighbourhood_id}/people"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/{force_id}/{neighbourhood_id}/events")
async def get_neighbourhood_events(force_id: str, neighbourhood_id: str):
    url = f"{BASE_URL}/{force_id}/{neighbourhood_id}/events"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/{force_id}/{neighbourhood_id}/priorities")
async def get_neighbourhood_priorities(force_id: str, neighbourhood_id: str):
    url = f"{BASE_URL}/{force_id}/{neighbourhood_id}/priorities"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()
