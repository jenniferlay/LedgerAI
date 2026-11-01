from fastapi import APIRouter

from . import accounts, link, sync, webhooks

router = APIRouter(prefix="/plaid", tags=["plaid"])
router.include_router(link.router)
router.include_router(sync.router)
router.include_router(webhooks.router)
router.include_router(accounts.router)
