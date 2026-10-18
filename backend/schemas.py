from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class Restaurant(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city: str
    state: str
    cuisine: List[str] = Field(default_factory=list)
    rating: Optional[float] = None
    reviews: int = 0
    is_legit: bool = True
    last_checked: Optional[str] = None
    score: Optional[float] = None


class CityList(BaseModel):
    cities: List[str]
