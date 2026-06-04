import asyncio
from fastapi import APIRouter, HTTPException
import httpx
import pandas as pd

router = APIRouter()
BASE_URL = "https://data.police.uk/api"

@router.get("/by-location")
async def get_stops_by_location(lat: str, lng: str, date: str = None):
    url = f"{BASE_URL}/stops-street?lat={lat}&lng={lng}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            return response.json()
        except ValueError:
            return []

@router.get("/at-location")
async def get_stops_at_location(location_id: str, date: str = None):
    url = f"{BASE_URL}/stops-at-location?location_id={location_id}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            return response.json()
        except ValueError:
            return []

@router.get("/no-location")
async def get_stops_no_location(force: str, date: str = None):
    url = f"{BASE_URL}/stops-no-location?force={force}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            return response.json()
        except ValueError:
            return []

@router.get("/by-force")
async def get_stops_by_force(force: str, date: str = None):
    url = f"{BASE_URL}/stops-force?force={force}"
    if date: url += f"&date={date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            return response.json()
        except ValueError:
            return []

@router.get("/analytics/by-force")
async def get_stops_analytics_by_force(force: str, date: str = None):
    url = f"{BASE_URL}/stops-force?force={force}"
    if date: url += f"&date={date}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        try:
            data = response.json()
        except ValueError:
            return {"error": "Failed to parse data or no data available."}
        
        if not data:
            return {"total_records": 0, "analytics": {}, "raw_data": []}
            
        df = pd.DataFrame(data)
        
        # Clean data: Replace None/NaN with "Not Specified"
        for col in ['age_range', 'officer_defined_ethnicity', 'gender', 'object_of_search', 'outcome', 'legislation', 'type']:
            if col not in df.columns:
                df[col] = "Not Specified"
            else:
                df[col] = df[col].fillna("Not Specified")
                df.loc[df[col] == '', col] = "Not Specified"
                df.loc[df[col] == 'None', col] = "Not Specified"
                
        if 'removal_of_more_than_outer_clothing' not in df.columns:
            df['removal_of_more_than_outer_clothing'] = False
        df['removal_of_more_than_outer_clothing'] = df['removal_of_more_than_outer_clothing'].fillna(False)

        # Demographics Profiling
        age_counts = df['age_range'].value_counts().to_dict()
        ethnicity_counts = df['officer_defined_ethnicity'].value_counts().to_dict()
        gender_counts = df['gender'].value_counts().to_dict()
        
        # Motives, Operations, and Outcomes
        object_counts = df['object_of_search'].value_counts().to_dict()
        outcome_counts = df['outcome'].value_counts().to_dict()
        legislation_counts = df['legislation'].value_counts().to_dict()
        type_counts = df['type'].value_counts().to_dict()
        strip_searches = int(df['removal_of_more_than_outer_clothing'].sum())

        return {
            "total_records": len(df),
            "strip_searches": strip_searches,
            "analytics": {
                "age_profile": age_counts,
                "ethnicity_profile": ethnicity_counts,
                "gender_profile": gender_counts,
                "object_of_search": object_counts,
                "outcomes": outcome_counts,
                "legislation": legislation_counts,
                "type": type_counts
            },
            "raw_data": data[:50]  # Return a sample of raw data for performance
        }

@router.get("/analytics/rankings")
async def get_national_rankings(date: str):
    availability_url = f"{BASE_URL}/crimes-street-dates"
    async with httpx.AsyncClient() as client:
        avail_resp = await client.get(availability_url)
        try:
            avail_data = avail_resp.json()
        except ValueError:
            return {"error": "Failed to fetch availability"}
        
        forces = []
        for d in avail_data:
            if d.get("date") == date:
                forces = d.get("stop-and-search", [])
                break
                
        if not forces:
            return {"error": f"No data available for {date}."}
            
        async def fetch_force(force_id):
            url = f"{BASE_URL}/stops-force?force={force_id}&date={date}"
            try:
                resp = await client.get(url, timeout=15.0)
                data = resp.json()
                for item in data:
                    item['force_id'] = force_id
                return data
            except Exception:
                return []
                
        tasks = [fetch_force(f) for f in forces]
        results = await asyncio.gather(*tasks)
        
        all_stops = []
        for res in results:
            if isinstance(res, list):
                all_stops.extend(res)
                
        if not all_stops:
             return {"total_records": 0, "analytics": {}}

        df = pd.DataFrame(all_stops)
        
        for col in ['age_range', 'officer_defined_ethnicity', 'gender', 'object_of_search', 'force_id']:
            if col not in df.columns:
                df[col] = "Not Specified"
            else:
                df[col] = df[col].fillna("Not Specified")
                df.loc[df[col] == '', col] = "Not Specified"
                df.loc[df[col] == 'None', col] = "Not Specified"
                
        force_counts = df['force_id'].value_counts().head(15).to_dict()
        ethnicity_counts = df['officer_defined_ethnicity'].value_counts().to_dict()
        age_counts = df['age_range'].value_counts().to_dict()
        gender_counts = df['gender'].value_counts().to_dict()
        object_counts = df['object_of_search'].value_counts().to_dict()
        
        return {
            "total_records": len(df),
            "analytics": {
                "force_ranking": force_counts,
                "ethnicity_ranking": ethnicity_counts,
                "age_ranking": age_counts,
                "gender_ranking": gender_counts,
                "object_ranking": object_counts
            }
        }
