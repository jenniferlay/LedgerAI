from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.category.icons import MATERIAL_ICONS


def _check_icon(value: str) -> str:
	if value not in MATERIAL_ICONS:
		raise ValueError("Unknown icon; choose one from GET /categories/icons")
	return value


MaterialIconName = Annotated[str, AfterValidator(_check_icon)]


class CategoryCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: Annotated[
		str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
	]
	parent_categoryid: int | None = Field(default=None, gt=0)
	icon: MaterialIconName | None = None


class CategoryResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	categoryid: int
	parent_categoryid: int | None
	name: str
	icon: str | None  # plain str on output so a stale stored value never causes a 500