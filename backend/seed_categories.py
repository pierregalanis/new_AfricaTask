"""Seed service categories with bilingual support."""

SERVICE_CATEGORIES = [
    {
        "name_en": "Home & Repairs",
        "name_fr": "Maison & Réparations",
        "icon": "🏠",
        "subcategories": [
            {"en": "Furniture Assembly / IKEA Assembly", "fr": "Montage de meubles / IKEA"},
            {"en": "Indoor Painting & Decoration", "fr": "Peinture intérieure & décoration"},
            {"en": "General Home Repairs / Handyman", "fr": "Réparations domestiques / Bricolage"},
            {"en": "Light Carpentry", "fr": "Menuiserie légère"},
            {"en": "Smart Home / TV Mounting & Repairs", "fr": "Installation domotique / Montage et réparation de téléviseur"},
            {"en": "Help Moving (including packing/unpacking)", "fr": "Aide au déménagement (emballage/déballage)"},
            {"en": "Heavy Lifting & Loading", "fr": "Levage lourd & chargement"},
            {"en": "Trash & Furniture Removal", "fr": "Enlèvement de déchets et mobilier"},
            {"en": "Yard Work & Snow Removal", "fr": "Jardinage & déneigement"},
        ]
    },
    {
        "name_en": "Cleaning & Organization",
        "name_fr": "Nettoyage & Organisation",
        "icon": "🧹",
        "subcategories": [
            {"en": "Cleaning & Spring Cleaning", "fr": "Nettoyage général & grand ménage"},
            {"en": "Organization / Room Measurement", "fr": "Organisation / Mesure d'espace"},
        ]
    },
    {
        "name_en": "Errands & Personal Help",
        "name_fr": "Courses & Aide Personnelle",
        "icon": "📦",
        "subcategories": [
            {"en": "Errands & Personal Assistant", "fr": "Courses & assistance personnelle"},
            {"en": "Waiting in Line / Event Staffing", "fr": "Attente en file / Aide événementielle"},
        ]
    },
    {
        "name_en": "Crafts & Creative",
        "name_fr": "Arts & Créatif",
        "icon": "🎨",
        "subcategories": [
            {"en": "Arts & Crafts", "fr": "Arts & artisanat"},
            {"en": "Photography", "fr": "Photographie"},
        ]
    },
    {
        "name_en": "Kitchen & Food",
        "name_fr": "Cuisine & Alimentation",
        "icon": "🍳",
        "subcategories": [
            {"en": "Cooking / Baking", "fr": "Cuisine & pâtisserie"},
        ]
    },
    {
        "name_en": "Home Administration",
        "name_fr": "Administration Domestique",
        "icon": "🧺",
        "subcategories": [
            {"en": "Laundry & Ironing", "fr": "Lessive & repassage"},
            {"en": "Data Entry / Office Administration", "fr": "Saisie de données & administration de bureau"},
            {"en": "Project Coordination", "fr": "Coordination de projet"},
        ]
    },
    {
        "name_en": "Clothing & Sewing",
        "name_fr": "Vêtements & Couture",
        "icon": "🧵",
        "subcategories": [
            {"en": "Sewing", "fr": "Couture"},
        ]
    },
    {
        "name_en": "Beauty & Grooming",
        "name_fr": "Beauté & Soins",
        "icon": "💄",
        "subcategories": [
            {"en": "Beauty Services", "fr": "Services de beauté"},
            {"en": "Hair Styling & Barber", "fr": "Coiffure & barbier"},
            {"en": "Make-Up Services", "fr": "Maquillage (quotidien/soirée/mariée)"},
            {"en": "Nail Services", "fr": "Onglerie (manucure, pédicure, nail art)"},
        ]
    },
    {
        "name_en": "Education & Tutoring",
        "name_fr": "Éducation & Tutorat",
        "icon": "📚",
        "subcategories": [
            {"en": "Education", "fr": "Éducation"},
            {"en": "Tutoring", "fr": "Soutien scolaire / Tutorat"},
        ]
    },
    {
        "name_en": "Child Care & Daycare",
        "name_fr": "Garde d'Enfants",
        "icon": "👶",
        "subcategories": [
            {"en": "Daycare / Nanny", "fr": "Garderie / Nounou"},
        ]
    },
    {
        "name_en": "Car Services",
        "name_fr": "Services Automobiles",
        "icon": "🚗",
        "subcategories": [
            {"en": "Mechanic / Garagist", "fr": "Mécanique / Garagiste"},
            {"en": "Car Cleaning & Detailing", "fr": "Nettoyage & detailing automobile"},
        ]
    },
]


async def seed_service_categories(db):
    """Seed the service categories collection."""
    # Check if categories already exist
    count = await db.service_categories.count_documents({})
    if count > 0:
        print(f"Service categories already seeded ({count} categories)")
        return
    
    # Insert categories with generated IDs
    from models import ServiceCategory
    import uuid
    
    categories_to_insert = []
    for cat in SERVICE_CATEGORIES:
        category = ServiceCategory(
            id=str(uuid.uuid4()),
            name_en=cat["name_en"],
            name_fr=cat["name_fr"],
            icon=cat["icon"],
            subcategories=cat["subcategories"]
        )
        categories_to_insert.append(category.model_dump())
    
    result = await db.service_categories.insert_many(categories_to_insert)
    print(f"Seeded {len(result.inserted_ids)} service categories")
