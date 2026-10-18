from pydantic import BaseModel, ConfigDict

class CategoryResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	categoryid: int
	parent_categoryid: int | None
	name: str