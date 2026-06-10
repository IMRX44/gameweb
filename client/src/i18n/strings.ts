// Bilingual string catalog. Add a key to BOTH locales to keep them in sync.
// `dir` drives the whole layout direction (RTL for Persian, LTR for English).

export type Lang = 'en' | 'fa';

export interface LocaleMeta {
  name: string; // shown in the language switcher
  dir: 'ltr' | 'rtl';
}

export const LOCALE_META: Record<Lang, LocaleMeta> = {
  en: { name: 'English', dir: 'ltr' },
  fa: { name: 'فارسی', dir: 'rtl' },
};

type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'Nebula Conquest',
  'app.tagline': 'Conquer the galaxy, one planet at a time.',

  'common.back': 'Back',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.connecting': 'Connecting…',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.you': 'You',
  'common.bot': 'Bot',
  'common.error': 'Something went wrong.',

  'menu.play': 'Quick Match',
  'menu.playDesc': 'Jump straight into a galaxy versus bots.',
  'menu.online': 'Online Match',
  'menu.onlineDesc': 'Battle other players, bots fill the rest.',
  'menu.shop': 'Shop',
  'menu.shopDesc': 'Cosmetics only — never pay to win.',
  'menu.howto': 'How to play',
  'menu.namePlaceholder': 'Your callsign',
  'menu.save': 'Save',
  'menu.crystals': 'Crystals',
  'menu.record': 'Wins {wins} / Games {games}',

  'howto.title': 'How to play',
  'howto.l1': 'Tap one of YOUR planets to select it as a source.',
  'howto.l2': 'Tap another planet to send a fleet there.',
  'howto.l3': 'Or drag from your planet to a target to launch instantly.',
  'howto.l4': 'Use the % buttons to choose how many ships to send.',
  'howto.l5': 'Pinch or scroll to zoom, drag empty space to pan.',
  'howto.l6': 'Capture every rival planet to win. Allies can reinforce you.',

  'lobby.title': 'Lobby',
  'lobby.mode.quick': 'Quick Match',
  'lobby.mode.online': 'Online Match',
  'lobby.waiting': 'Waiting for players…',
  'lobby.players': 'Pilots ({n})',
  'lobby.startingIn': 'Starting in {n}…',
  'lobby.leave': 'Leave',

  'hud.send': 'Send',
  'hud.fleetSize': 'Fleet size',
  'hud.selectSource': 'Select one of your planets',
  'hud.selected': 'Selected: {n} ships',
  'hud.alliances': 'Alliances',
  'hud.ally': 'Ally',
  'hud.unally': 'Break',
  'hud.allyProposed': '{name} proposed an alliance',
  'hud.surrender': 'Leave match',
  'hud.chat': 'Chat',
  'hud.chatPlaceholder': 'Message…',
  'hud.planets': 'Planets',
  'hud.ships': 'Ships',

  'over.victory': 'Victory!',
  'over.defeat': 'Defeated',
  'over.draw': 'Match over',
  'over.winner': 'Winner: {name}',
  'over.rematch': 'Play again',
  'over.menu': 'Main menu',
  'over.captured': 'Captured',
  'over.sent': 'Ships sent',
  'over.lost': 'Planets lost',
  'over.standings': 'Final standings',

  'shop.title': 'Shop',
  'shop.tab.cosmetics': 'Cosmetics',
  'shop.tab.crystals': 'Crystals',
  'shop.buy': 'Buy',
  'shop.owned': 'Owned',
  'shop.equip': 'Equip',
  'shop.equipped': 'Equipped',
  'shop.buyCrystals': 'Buy',
  'shop.fairness': 'Every item here is purely cosmetic. Skill wins matches, not your wallet.',
  'shop.success': 'Purchase complete!',
  'shop.notEnough': 'Not enough crystals.',
  'shop.crystalsGranted': '+{n} crystals added!',
  'shop.type.ship_skin': 'Ship Skins',
  'shop.type.trail': 'Trails',
  'shop.type.planet_theme': 'Planet Themes',
  'shop.type.nameplate': 'Nameplates',
  'shop.type.emote': 'Emotes',
  'shop.rarity.common': 'Common',
  'shop.rarity.rare': 'Rare',
  'shop.rarity.epic': 'Epic',
  'shop.rarity.legendary': 'Legendary',
  'shop.bonus': '+{n} bonus',

  'net.connecting': 'Connecting to the galaxy…',
  'net.disconnected': 'Connection lost. Reconnecting…',
  'net.searching': 'Finding a match…',
};

const fa: Dict = {
  'app.title': 'نبولا کانکوست',
  'app.tagline': 'کهکشان را فتح کن، سیاره به سیاره.',

  'common.back': 'بازگشت',
  'common.close': 'بستن',
  'common.loading': 'در حال بارگذاری…',
  'common.connecting': 'در حال اتصال…',
  'common.retry': 'تلاش دوباره',
  'common.cancel': 'انصراف',
  'common.confirm': 'تأیید',
  'common.you': 'شما',
  'common.bot': 'ربات',
  'common.error': 'مشکلی پیش آمد.',

  'menu.play': 'بازی سریع',
  'menu.playDesc': 'مستقیم وارد یک کهکشان مقابل ربات‌ها شو.',
  'menu.online': 'بازی آنلاین',
  'menu.onlineDesc': 'با بازیکن‌های دیگر بجنگ، بقیه را ربات‌ها پر می‌کنند.',
  'menu.shop': 'فروشگاه',
  'menu.shopDesc': 'فقط ظاهری — هرگز پی‌تو‌وین نیست.',
  'menu.howto': 'آموزش بازی',
  'menu.namePlaceholder': 'نام خلبان',
  'menu.save': 'ذخیره',
  'menu.crystals': 'کریستال',
  'menu.record': 'برد {wins} / بازی {games}',

  'howto.title': 'چطور بازی کنیم',
  'howto.l1': 'روی یکی از سیاره‌های خودت بزن تا به‌عنوان مبدأ انتخاب شود.',
  'howto.l2': 'روی سیاره‌ی دیگری بزن تا ناوگان به آنجا بفرستی.',
  'howto.l3': 'یا از سیاره‌ات به سمت هدف بکش تا فوری حمله کنی.',
  'howto.l4': 'با دکمه‌های درصد، تعداد سفینه‌های ارسالی را انتخاب کن.',
  'howto.l5': 'برای زوم پینچ یا اسکرول کن، فضای خالی را بکش تا جابه‌جا شوی.',
  'howto.l6': 'برای برد همه‌ی سیاره‌های رقیب را بگیر. هم‌پیمانان می‌توانند تقویتت کنند.',

  'lobby.title': 'اتاق انتظار',
  'lobby.mode.quick': 'بازی سریع',
  'lobby.mode.online': 'بازی آنلاین',
  'lobby.waiting': 'در انتظار بازیکنان…',
  'lobby.players': 'خلبان‌ها ({n})',
  'lobby.startingIn': 'شروع تا {n}…',
  'lobby.leave': 'خروج',

  'hud.send': 'ارسال',
  'hud.fleetSize': 'اندازه‌ی ناوگان',
  'hud.selectSource': 'یکی از سیاره‌های خود را انتخاب کن',
  'hud.selected': 'انتخاب‌شده: {n} سفینه',
  'hud.alliances': 'اتحادها',
  'hud.ally': 'اتحاد',
  'hud.unally': 'شکستن',
  'hud.allyProposed': '{name} پیشنهاد اتحاد داد',
  'hud.surrender': 'ترک بازی',
  'hud.chat': 'گفتگو',
  'hud.chatPlaceholder': 'پیام…',
  'hud.planets': 'سیاره‌ها',
  'hud.ships': 'سفینه‌ها',

  'over.victory': 'پیروزی!',
  'over.defeat': 'شکست',
  'over.draw': 'پایان بازی',
  'over.winner': 'برنده: {name}',
  'over.rematch': 'بازی دوباره',
  'over.menu': 'منوی اصلی',
  'over.captured': 'تصرف‌شده',
  'over.sent': 'سفینه‌ی ارسالی',
  'over.lost': 'سیاره‌ی ازدست‌رفته',
  'over.standings': 'رده‌بندی نهایی',

  'shop.title': 'فروشگاه',
  'shop.tab.cosmetics': 'ظاهری',
  'shop.tab.crystals': 'کریستال',
  'shop.buy': 'خرید',
  'shop.owned': 'در اختیار',
  'shop.equip': 'استفاده',
  'shop.equipped': 'فعال',
  'shop.buyCrystals': 'خرید',
  'shop.fairness': 'همه‌ی آیتم‌ها فقط ظاهری‌اند. مهارت بازی را می‌برد، نه کیف پولت.',
  'shop.success': 'خرید انجام شد!',
  'shop.notEnough': 'کریستال کافی نداری.',
  'shop.crystalsGranted': '{n}+ کریستال اضافه شد!',
  'shop.type.ship_skin': 'پوسته‌ی سفینه',
  'shop.type.trail': 'دنباله',
  'shop.type.planet_theme': 'تم سیاره',
  'shop.type.nameplate': 'نام‌نشان',
  'shop.type.emote': 'ایموجی',
  'shop.rarity.common': 'معمولی',
  'shop.rarity.rare': 'کمیاب',
  'shop.rarity.epic': 'حماسی',
  'shop.rarity.legendary': 'افسانه‌ای',
  'shop.bonus': '{n}+ پاداش',

  'net.connecting': 'در حال اتصال به کهکشان…',
  'net.disconnected': 'اتصال قطع شد. در حال اتصال مجدد…',
  'net.searching': 'در حال یافتن بازی…',
};

export const STRINGS: Record<Lang, Dict> = { en, fa };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}
