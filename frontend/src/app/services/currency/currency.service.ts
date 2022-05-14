import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export type CurrencyRate ={from_to: string, rate: number};

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {


  private currencies: string[] = [ "ALL", "XCD", "EUR", "BBD", "BTN", "BND", "XAF", "CUP", "USD", "FKP", "GIP", "HUF", "IRR", "JMD", "AUD", "LAK", "LYD", "MKD", "XOF", "NZD", "OMR", "PGK", "RWF", "WST", "RSD", "SEK", "TZS", "AMD", "BSD", "BAM", "CVE", "CNY", "CRC", "CZK", "ERN", "GEL", "HTG", "INR", "JOD", "KRW", "LBP", "MWK", "MRO", "MZN", "ANG", "PEN", "QAR", "STD", "SLL", "SOS", "SDG", "SYP", "AOA", "AWG", "BHD", "BZD", "BWP", "BIF", "KYD", "COP", "DKK", "GTQ", "HNL", "IDR", "ILS", "KZT", "KWD", "LSL", "MYR", "MUR", "MNT", "MMK", "NGN", "PAB", "PHP", "RON", "SAR", "SGD", "ZAR", "SRD", "TWD", "TOP", "VEF", "DZD", "ARS", "AZN", "BYR", "BOB", "BGN", "CAD", "CLP", "CDF", "DOP", "FJD", "GMD", "GYD", "ISK", "IQD", "JPY", "KPW", "LVL", "CHF", "MGA", "MDL", "MAD", "NPR", "NIO", "PKR", "PYG", "SHP", "SCR", "SBD", "LKR", "THB", "TRY", "AED", "VUV", "YER", "AFN", "BDT", "BRL", "KHR", "KMF", "HRK", "DJF", "EGP", "ETB", "XPF", "GHS", "GNF", "HKD", "XDR", "KES", "KGS", "LRD", "MOP", "MVR", "MXN", "NAD", "NOK", "PLN", "RUB", "SZL", "TJS", "TTD", "UGX", "UYU", "VND", "TND", "UAH", "UZS", "TMT", "GBP", "ZMW", "BTC", "BYN", "BMD", "GGP", "CLF", "CUC", "IMP", "JEP", "SVC", "ZMK", "XAG", "ZWL" ];

  constructor(private http: HttpClient) { }

  async convertCurrency(from: string, to: string): Promise<any>{
    let res;
    try {
      // all this is for memorizing every time a new rate has been fenteched and write that in into localstorage: TODO: persist in indexedDB and write all currencies in there
      res = await this.http.get(`https://free.currconv.com/api/v7/convert?q=${from}_${to}&compact=ultra&apiKey=154c04e70fa53eb6bad7`).toPromise();
      let rates: CurrencyRate[] = ( JSON.parse(localStorage.getItem("currencyRates")) || []) as CurrencyRate[];
      let match = rates.find(el=>el.from_to == Object.keys(res)[0]);
      if(!match){
        let newEntry: CurrencyRate =  {from_to:Object.keys(res)[0], rate: undefined};
        match = newEntry;
        rates.push(newEntry);
      }
      match.rate = res[Object.keys(res)[0]]
      localStorage.setItem("currencyRates", JSON.stringify(rates))
      return res;
    } catch (error) {
      // offline
      let rates: CurrencyRate[] = ( JSON.parse(localStorage.getItem("currencyRates")) || []) as CurrencyRate[];
      let match = rates.find(el=>el.from_to == `${from}_${to}`);
      let result = {};
      result[`${from}_${to}`] = match.rate
      return result;
    }

  }

  getCurrencies(): string[]{
    return this.currencies;
  }

  getOfflineCurrencies(): string[]{
    let rates: CurrencyRate[] = JSON.parse(localStorage.getItem("currencyRates"))
    return rates.map(el=>el.from_to).map(el=>el.split("_")[1]);
  }
}


export type CurrencyApiResponse = {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: any;
}
