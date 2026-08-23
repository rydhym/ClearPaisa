export class MerchantNormalizer {
  private static mappings: Record<string, string> = {
    'amazon pay india': 'Amazon',
    'amazon seller services': 'Amazon',
    'amazon pay': 'Amazon',
    'swiggy ltd': 'Swiggy',
    'swiggy instamart': 'Swiggy',
    'swiggy': 'Swiggy',
    'uber trip': 'Uber',
    'uber india': 'Uber',
    'netflix entertainment': 'Netflix',
    'netflix.com': 'Netflix',
    'spotify india': 'Spotify',
    'spotify premium': 'Spotify',
    'google *youtube': 'YouTube',
    'youtube premium': 'YouTube',
    'zomato': 'Zomato',
    'zomato media': 'Zomato',
    'ola cabs': 'Ola',
    'ola ride': 'Ola',
    'jiomart': 'JioMart',
    'reliance retail': 'Reliance Retail',
    'tata 1mg': '1mg',
    'pharmeasy': 'PharmEasy',
    'airtel': 'Airtel',
    'jio': 'Jio',
    'electricity board': 'Electricity',
    'chatgpt subscription': 'ChatGPT',
    'openai': 'ChatGPT',
  };

  static normalize(rawName: string): string {
    if (!rawName) return 'Others';
    const clean = rawName.toLowerCase().trim();
    
    // Check direct mappings
    for (const [key, value] of Object.entries(this.mappings)) {
      if (clean.includes(key)) {
        return value;
      }
    }

    // Capitalize first letter of each word if no mapping matches
    return rawName
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
}
