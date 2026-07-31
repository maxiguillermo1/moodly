/**
 * @fileoverview Habit definitions (icons + pastel accents for Today + Habits screen).
 * @module lib/constants/habitsCatalog
 */
export const HABIT_CATALOG = [
    {
        id: 'workout',
        label: 'Workout',
        subtitle: 'Early gym session or any movement you enjoy',
        icon: 'barbell-outline',
        activeBg: '#FFD6E5',
        activeFg: '#4A1530',
        catalogSurfaceLight: 'rgba(255, 214, 229, 0.55)',
        catalogSurfaceDark: 'rgba(255, 170, 200, 0.2)',
    },
    {
        id: 'read_book',
        label: 'Read Book',
        subtitle: 'A few pages or a chapter—fiction or nonfiction',
        icon: 'book-outline',
        activeBg: '#D6E8FF',
        activeFg: '#162C4A',
        catalogSurfaceLight: 'rgba(214, 232, 255, 0.65)',
        catalogSurfaceDark: 'rgba(120, 180, 255, 0.2)',
    },
    {
        id: 'meditate',
        label: 'Meditate',
        subtitle: 'Breath, stillness, or a short guided session',
        icon: 'leaf-outline',
        activeBg: '#E8E0FF',
        activeFg: '#2D214A',
        catalogSurfaceLight: 'rgba(232, 224, 255, 0.65)',
        catalogSurfaceDark: 'rgba(190, 170, 255, 0.22)',
    },
    {
        id: 'drink_water',
        label: 'Drink Water',
        subtitle: 'Stay hydrated across the day',
        icon: 'water-outline',
        activeBg: '#D6F7FF',
        activeFg: '#143E4A',
        catalogSurfaceLight: 'rgba(214, 247, 255, 0.7)',
        catalogSurfaceDark: 'rgba(100, 210, 240, 0.18)',
    },
    {
        id: 'journaling',
        label: 'Journaling',
        subtitle: 'Capture thoughts, gratitude, or a daily highlight',
        icon: 'create-outline',
        activeBg: '#FFF2D6',
        activeFg: '#4A3814',
        catalogSurfaceLight: 'rgba(255, 242, 214, 0.7)',
        catalogSurfaceDark: 'rgba(255, 210, 150, 0.18)',
    },
    {
        id: 'early_wake',
        label: 'Early Wake Up',
        subtitle: 'Start the day with intention',
        icon: 'sunny-outline',
        activeBg: '#FFE9CC',
        activeFg: '#4A3010',
        catalogSurfaceLight: 'rgba(255, 233, 204, 0.7)',
        catalogSurfaceDark: 'rgba(255, 190, 130, 0.2)',
    },
    {
        id: 'no_junk_food',
        label: 'No Junk Food',
        subtitle: 'Reach for nourishing choices today',
        icon: 'nutrition-outline',
        activeBg: '#D8F5E0',
        activeFg: '#143D22',
        catalogSurfaceLight: 'rgba(216, 245, 224, 0.65)',
        catalogSurfaceDark: 'rgba(120, 220, 160, 0.18)',
    },
];
export const HABIT_IDS = HABIT_CATALOG.map((h) => h.id);
const habitById = new Map(HABIT_CATALOG.map((h) => [h.id, h]));
export function getHabitById(id) {
    const h = habitById.get(id);
    if (!h)
        throw new Error(`Unknown habit id: ${id}`);
    return h;
}
export function isHabitId(value) {
    return habitById.has(value);
}
