import { Component, OnInit, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { AudioService, ExpenseSTTResult } from 'src/app/services/audio/audio.service';
import { takeUntil, bufferTime, map } from 'rxjs/operators';
import { SliderService } from 'src/app/services/slider/slider.service';
import { ExpenseService, Expense } from 'src/app/services/expenses/expense.service';
import { GroupsService } from 'src/app/services/groups/groups.service';

/**
 * This used to be more complex sending resampled auto over our backend to google speech api but was reduced ina  failed expeeriment here that is left in the repo since we wont do the former soluto anyways - waiting fpor pwa's to supüport Web Speech aoi   for Safari (after added tio homesvreen))
 */

@Component({
  selector: 'app-stt-recorder',
  templateUrl: './stt-recorder.component.html',
  styleUrls: ['./stt-recorder.component.less']
})
export class SttRecorderComponent implements OnInit {

  constructor(
    private audioService: AudioService,
    private sliderService: SliderService,
  ) { }

  public results: any[] = [];
  public isRecording = false;

  ngOnInit(): void {
    // this.navigateToAddSlider();//remove me fixme todo
  }

  navigateToAddSlider() {
    this.sliderService.show('add');
  }

  pointerDown: boolean = false;

  onPointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.pointerDown = true;
    setTimeout(() => {
      if (this.pointerDown) {
        // this.startRecording()
        this.navigateToAddSlider();
      } else {
        this.navigateToAddSlider();
      }
    }, 250)
  }

  currentlyRecording= false;
  SpeechGrammarList = (window as any).SpeechGrammarList;
  SpeechRecognitionEvent = (window as any).SpeechRecognitionEvent;


  SpeechRecognition = (window as any).webkitSpeechRecognition ;
  public sttResult: string;
  recognition = new this.SpeechRecognition();

  async startRecording() {
    console.log("start rec called")
    this.isRecording = true;
    this.recognition.lang = 'de-DE';
    this.audioService.recentStt$.next(true);

      this.currentlyRecording= true
      this.recognition.start();
      // alert(this.recognition)

      this.recognition.onresult = (event) => {
        console.log("stop rec called")

        this.isRecording = false;
        this.sttResult = event.results[0][0].transcript;
        console.log(this.sttResult)
        alert(this.sttResult)
      }
    }
  }
