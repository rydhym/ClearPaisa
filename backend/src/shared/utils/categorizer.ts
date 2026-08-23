export class Categorizer {
  private static rules: Record<string, string[]> = {
    Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'grocery', 'supermarket', 'blinkit', 'zepto', 'starbucks', 'mcdonalds', 'food', 'bakery', 'eats'],
    Shopping: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'electronics', 'apparel', 'shopping', 'nike', 'decathlon', 'retail'],
    Bills: ['electricity', 'water', 'gas', 'bescom', 'bses', 'mahadiscom', 'broadband', 'act fibernet', 'spectranet', 'utility'],
    Travel: ['uber', 'ola', 'irctc', 'indigo', 'makemytrip', 'goibibo', 'hotel', 'flight', 'railway', 'metro', 'cab', 'ride', 'taxi'],
    Fuel: ['hpcl', 'bpcl', 'iocl', 'shell', 'fuel', 'petrol', 'diesel', 'cng'],
    Medicine: ['1mg', 'pharmeasy', 'apollo', 'hospital', 'pharmacy', 'chemist', 'doctor', 'clinic', 'medical'],
    Entertainment: ['netflix', 'spotify', 'youtube', 'bookmyshow', 'hotstar', 'prime video', 'disney', 'gaming', 'steam', 'theatre'],
    Salary: ['salary', 'paycheck', 'payroll', 'stipend', 'bonus', 'credit salary'],
    Investments: ['zerodha', 'groww', 'coin', 'mutual fund', 'stocks', 'sip', 'indmoney', 'upstox', 'nse', 'bse'],
    Insurance: ['lic', 'hdfc ergo', 'max life', 'insurance', 'tata aia'],
    Rent: ['rent', 'landlord', 'pg accommodation', 'brokerage'],
    Education: ['coursera', 'udemy', 'school', 'college', 'tuition', 'books', 'stationery', 'university'],
    Taxes: ['income tax', 'gst', 'property tax', 'tds', 'tax paid'],
    EMIs: ['emi', 'loan', 'home loan', 'car loan', 'axis loan', 'sbi card emi'],
    Recharge: ['recharge', 'prepaid', 'postpaid', 'airtel', 'jio', 'vi ', 'fastag', 'dth'],
    Transfer: ['transfer', 'self transfer', 'to self', 'p2p', 'sent to', 'received from'],
    ATM: ['atm', 'cash withdrawal', 'withdrawal']
  };

  static categorize(description: string, merchant: string): string {
    const text = `${description || ''} ${merchant || ''}`.toLowerCase();

    for (const [category, keywords] of Object.entries(this.rules)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return 'Others';
  }
}
