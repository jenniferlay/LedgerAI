# Allowed category icons: names from MaterialIcons in @expo/vector-icons.
# Single source of truth for the API; the app loads it from GET /categories/icons.
# Verify against your installed version with scripts/check_icons.js.
MATERIAL_ICONS: frozenset[str] = frozenset(
	{
		# food & drink
		"restaurant", "local-cafe", "local-bar", "fastfood", "local-pizza",
		"local-grocery-store", "bakery-dining", "cake", "icecream",
		# shopping & gifts
		"shopping-cart", "shopping-bag", "store", "local-mall", "redeem",
		"card-giftcard", "local-offer", "label", "sell",
		# transport & travel
		"directions-car", "local-gas-station", "directions-bus", "train", "flight",
		"local-taxi", "directions-bike", "two-wheeler", "local-parking",
		"ev-station", "local-shipping", "directions-boat", "hotel", "beach-access",
		# home, utilities & tech
		"home", "bolt", "flash-on", "electrical-services", "wifi", "smartphone",
		"phone-android", "local-laundry-service", "cleaning-services", "build",
		"devices", "laptop", "tv", "headphones", "headset", "camera-alt", "cloud",
		"subscriptions",
		# health & personal
		"favorite", "local-hospital", "local-pharmacy", "fitness-center", "spa",
		"content-cut",
		# entertainment
		"movie", "theaters", "music-note", "sports-esports", "sports-soccer",
		"videogame-asset", "star", "park",
		# education, family, work
		"school", "book", "menu-book", "child-care", "pets", "work",
		"volunteer-activism",
		# money
		"attach-money", "payment", "payments", "savings", "credit-card",
		"account-balance", "receipt", "pie-chart", "trending-up", "security",
		"gavel",
		# misc
		"category", "more-horiz",
	}
)