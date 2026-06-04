from fastapi import APIRouter, HTTPException, Query
import httpx
import pandas as pd

router = APIRouter()
BASE_URL = "https://data.police.uk/api"

@router.get("/availability")
async def get_availability():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/crimes-street-dates")
        return response.json()

@router.get("/street")
async def get_street_level_crimes(lat: str, lng: str, date: str = None):
    url = f"{BASE_URL}/crimes-street/all-crime?lat={lat}&lng={lng}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch data")
        return response.json()

@router.get("/outcomes-at-location")
async def get_outcomes_at_location(lat: str, lng: str, date: str = None):
    url = f"{BASE_URL}/outcomes-at-location?lat={lat}&lng={lng}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/at-location")
async def get_crimes_at_location(lat: str, lng: str, date: str = None):
    url = f"{BASE_URL}/crimes-at-location?lat={lat}&lng={lng}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()


@router.get("/no-location")
async def get_crimes_no_location(category: str, force: str, date: str = None):
    url = f"{BASE_URL}/crimes-no-location?category={category}&force={force}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/categories")
async def get_crime_categories(date: str = None):
    url = f"{BASE_URL}/crime-categories"
    if date: url += f"?date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/last-updated")
async def get_last_updated():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/crime-last-updated")
        return response.json()

@router.get("/outcomes-for-crime/{persistent_id}")
async def get_outcomes_for_crime(persistent_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/outcomes-for-crime/{persistent_id}")
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Crime not found")
        return response.json()

@router.get("/analytics/by-neighbourhood")
async def get_crimes_analytics_by_neighbourhood(force: str, neighbourhood: str, date: str = None):
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Fetch boundary
        boundary_response = await client.get(f"{BASE_URL}/{force}/{neighbourhood}/boundary")
        if boundary_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Neighbourhood boundary not found")
        boundary = boundary_response.json()
        
        # Extract coordinates and format poly string
        poly_str = ":".join([f"{p['latitude']},{p['longitude']}" for p in boundary])
        
        # 2. Fetch crimes via POST (to support large poly strings)
        data = {"poly": poly_str}
        if date:
            data["date"] = date
            
        crimes_response = await client.post(f"{BASE_URL}/crimes-street/all-crime", data=data)
        
        if crimes_response.status_code == 503:
            raise HTTPException(status_code=503, detail="Too many crimes returned. Area is too large.")
        elif crimes_response.status_code != 200:
            raise HTTPException(status_code=crimes_response.status_code, detail="Failed to fetch crimes for this neighbourhood")
            
        crimes = crimes_response.json()
        
        if not crimes:
            return {"analytics": {"total_crimes": 0, "by_category": {}, "by_outcome": {}}, "raw_data": []}
            
        # 3. Pandas Analytics
        df = pd.DataFrame(crimes)
        
        # Extract street name for hotspots
        if 'location' in df.columns:
            df['street_name'] = df['location'].apply(lambda x: x.get('street', {}).get('name', 'Unknown') if isinstance(x, dict) else 'Unknown')
        else:
            df['street_name'] = 'Unknown'
        hotspots = df['street_name'].value_counts().head(15).to_dict()
        
        if 'category' in df.columns:
            df['category'] = df['category'].fillna('Unknown')
            category_counts = df['category'].value_counts().to_dict()
        else:
            category_counts = {}
            
        if 'outcome_status' in df.columns:
            def get_outcome(x):
                if pd.isna(x): return 'Unknown'
                return x.get('category', 'Unknown') if isinstance(x, dict) else 'Unknown'
            df['outcome'] = df['outcome_status'].apply(get_outcome)
            outcome_counts = df['outcome'].value_counts().to_dict()
        else:
            outcome_counts = {}
            
        return {
            "analytics": {
                "total_crimes": len(df),
                "by_category": category_counts,
                "by_outcome": outcome_counts,
                "hotspots": hotspots
            },
            "raw_data": crimes[:50]  # Optimize performance by sending only 50 raw samples
        }

