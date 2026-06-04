from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()
BASE_URL = "https://data.police.uk/api"

@router.get("/")
async def get_all_forces():
    """
    Skill: List all police forces in the UK.
    """
    url = f"{BASE_URL}/forces"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/{force_id}")
async def get_specific_force(force_id: str):
    """
    Skill: Get specific details for a police force.
    """
    url = f"{BASE_URL}/forces/{force_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Force not found")
        return response.json()

@router.get("/{force_id}/senior-officers")
async def get_senior_officers(force_id: str):
    """
    Skill: Get senior officers for a specific police force.
    """
    url = f"{BASE_URL}/forces/{force_id}/senior-officers"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            return response.json()
        except ValueError:
            # Some forces do not have senior officers and the API returns empty/invalid JSON
            return []
