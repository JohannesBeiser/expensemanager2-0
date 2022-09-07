import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { HardcodedCategories } from '../category/category.service';

export type ExpenseSTTResult = {
  name: string;
  amount: number;
  category: string;
  description?: string;
}


@Injectable({
  providedIn: 'root'
})
export class AudioService {

  constructor(private http: HttpClient) { }

  public recentStt$ = new BehaviorSubject(false);

  public getTextFromAudio(binaryData: Int16Array): Promise<any> {
    setTimeout(() => this.recentStt$.next(false), 500)
    return this.http.post<any>("/api/audio", binaryData.buffer, { responseType: 'json' }).toPromise()
  }

  public getUserMediaStream(): Promise<MediaStream> {
    const constraints: any = {
      audio: {
        "noiseSuppression": true
      }
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }

private numbersAsText = ["eins", "zwei", "drei", "view", "fünf", "sechs", "sieben", "acht", "neun", "zehn"];
  /**
   * Reads information from the text and returns an object containing information like expense-amount, -name and category
   * @param text result from stt API call
   */
public parseSttResult(text: string): ExpenseSTTResult {
  text = text.toLowerCase();
  let remainingText: string = text;
  let result: ExpenseSTTResult = {
    amount: undefined,
    category: undefined,
    name: undefined
  }

  const categorySynonyms = {
    "food": ["food", "essen", "verpflegung"],
    "transport": ["transport", "transportation"],
    "accommodation": ["accommodation", "unterkunft"],
    "multimedia": ["multimedia"],
    "invest": ["invest", "investment", "investieren", "investierung"],
    "clothingGear": ["gear", "ausrüstung", "kleider", "kleidung", "clothing", "clothes"],
    "healthInsurance": ["health", "insurance", "gesundheit und versicherung", "gesundheit", "versicherung"],
    "general": ["general", "allgemein", "allgemeines"]
  };

  // find which category is contained in text and remove it from the string
  outerLoop: for (let singleCategory in categorySynonyms) {
    innerLoop: for (let synonym of categorySynonyms[singleCategory]) {
      if (text.includes(synonym)) {
        result.category = singleCategory;
        remainingText = text.replace(synonym, "").toLowerCase();
        break outerLoop;
      }
    }
  }

  const descriptionSynonyms = ["description", "beschreibung"]
  descriptionSynonyms.forEach(synonym=>{
    if(remainingText.includes(synonym)){
      let index = remainingText.indexOf(synonym);
      result.description = remainingText.substr(index+synonym.length).trim();
      remainingText = remainingText.substr(0, index);
    }
  });

  result.amount = this.getAmountFromText(remainingText);
  remainingText = this.removeWordsFromString(remainingText, ["euro", "eur", "cent", ...this.numbersAsText]).replace(/[0-9€,.]/g, '').trim();
  let capitalizedCategory = result.category?.charAt(0)?.toUpperCase() + result.category?.substring(1)
  let categoryId= HardcodedCategories[capitalizedCategory];

  if(!categoryId){
    result.category = undefined; // we need id here, if not found return undefined which results in a invalid result therefore not resulting in adding expense
  }else{
    result.category = categoryId;
  }
  result.name = remainingText.trim();
  return result;
}


private removeWordsFromString(text: string, words: string[]): string{
  words.forEach(word=>text = text.replace(word, ''));
  return text;
}

//Find amount from text and remove it
// accounts for "20 € 35" and "20,35 €" and "20,45€" etc
private getAmountFromText(text: string): number {
  // gives you an array of either spaces or numbers (spaces needed since speech api sometimes understands "20 € 50")
  let numbers = this.numbersAsTextToNumberString(text).replace(',', '.').replace(/[a-zA-Z€]/g, '').replace('euro', '').replace('eur', '').split(' ');
  let result = "";
  for (const number of numbers) {
    if (parseInt(number)) {
      if (result) {
        result += (parseInt(number) / 100).toString().slice(1)
        return parseFloat(result);
      } else {
        if (text.includes("cent")) {
          return (parseInt(number) / 100);
        }
        result = number.toString();
      }
    }
  }
  return parseFloat(result);
}

//parses "five dollar" to "5 dollar"
private numbersAsTextToNumberString(text: string): string {
  this.numbersAsText.forEach((number, index) => {
    text = text.replace(number, '' + (index + 1));
  })
  return text
}

}
