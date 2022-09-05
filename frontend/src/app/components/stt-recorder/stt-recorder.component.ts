import { Component, OnInit, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { AudioService, ExpenseSTTResult } from 'src/app/services/audio/audio.service';
import { takeUntil, bufferTime, map } from 'rxjs/operators';
import { SliderService } from 'src/app/services/slider/slider.service';
import { ExpenseService, Expense } from 'src/app/services/expenses/expense.service';
import { GroupsService } from 'src/app/services/groups/groups.service';


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

  public recordingState$: BehaviorSubject<string> = new BehaviorSubject('inactive');
  private data: Int16Array;
  public results: any[] = [];

  ngOnInit(): void {
    this.navigateToAddSlider();//remove me fixme todo
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
        this.startRecording()
      } else {
        this.navigateToAddSlider();
      }
    }, 250)
  }

  onPointerUp(e: PointerEvent) {
    this.pointerDown = false;
    e.preventDefault();
    e.stopPropagation();

    if (this.recordingState$.value == 'recording') {
      this.stopRecording();
    }
  }

  async startRecording() {
    this.audioService.recentStt$.next(true);
    if (this.recordingState$.value === 'inactive') {
      let audioStream = await this.audioService.getUserMediaStream();

      this.recordingState$.next("recording");

      this.data = new Int16Array();
      this.resampleStream(audioStream).subscribe((data) => {
        this.data = new Int16Array([...this.data, ...data]);
      });
    }
  }

  async stopRecording() {
    if (this.recordingState$.value === 'recording') {
      this.stopResampling();
      this.recordingState$.next('inactive');
      let result = await this.audioService.getTextFromAudio(this.data);
      let parsedResult= this.audioService.parseSttResult(result.transcription);
      if(parsedResult.amount && parsedResult.category && parsedResult.name){
        alert("feature currently disabled");
        // this.createExpenseFromSttResult(parsedResult);
      }else{
        alert("Please try again, Recognized: " + parsedResult.amount + '€, category: ' + parsedResult.category + ', name: ' + parsedResult.name + ' (transcription was: ' + result.transcription + ')')
      }
    }
  }


// createExpenseFromSttResult(sttResult: ExpenseSTTResult){
//   let expense: Expense = {...{
//     date: `${new Date().getFullYear()}-${('0' + (new Date().getMonth() +1)).slice(-2)}-${('0' + (new Date().getDate())).slice(-2)}`,
//     group: this.groupsService.defaultGroup,
//   }, ...sttResult};

//   this.expenseService.addExpense(expense, "expenses");
// }

audioContext: AudioContext;
gumStream: MediaStream;
resampledFrames$: Subject<Int16Array>;
streamEndNotifier$: Subject<void>;
resampledStream$: Observable<Int16Array>;

resampleStream(sourceStream: MediaStream, emitInterval: number = Number.MAX_SAFE_INTEGER / 10): Observable < Int16Array > {
  this.gumStream = sourceStream;
  this.resampledFrames$ = new Subject<Int16Array>();

  //TODO: Fix 'as any'
  this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
  let audioSource = this.audioContext.createMediaStreamSource(sourceStream);
  let node = this.audioContext.createScriptProcessor(4096, 1, 1);
  node.onaudioprocess = (e) => {
    this.processAudioFrame(e.inputBuffer.getChannelData(0), audioSource.context.sampleRate);
  };
  audioSource.connect(node);
  node.connect(this.audioContext.destination);

  this.streamEndNotifier$ = new Subject<void>();

  this.resampledStream$ = this.resampledFrames$.pipe(
    takeUntil(this.streamEndNotifier$),
    bufferTime(emitInterval),
    map(this.mergeInt16Arrays),
  );
  return this.resampledStream$;
}
mergeInt16Arrays(arrays: Int16Array[]): Int16Array {
  return arrays.reduce((previous, current) => {
    return new Int16Array([...previous, ...current]);
  }, new Int16Array())
}

inputBuffer = [];

processAudioFrame(inputFrame, inputSampleRate: number) {
  for (let i = 0; i < inputFrame.length; i++) {
    this.inputBuffer.push((inputFrame[i]) * 32767);
  }

  const goalSampleRate = 16000;
  const frameLength = 512;

  while ((this.inputBuffer.length * goalSampleRate / inputSampleRate) > frameLength) {
    let outputFrame = new Int16Array(frameLength);
    let sum = 0;
    let num = 0;
    let outputIndex = 0;
    let inputIndex = 0;

    while (outputIndex < frameLength) {
      sum = 0;
      num = 0;
      while (inputIndex < Math.min(this.inputBuffer.length, (outputIndex + 1) * inputSampleRate / goalSampleRate)) {
        sum += this.inputBuffer[inputIndex];
        num++;
        inputIndex++;
      }
      outputFrame[outputIndex] = sum / num;
      outputIndex++;
    }

    this.resampledFrames$.next(outputFrame);
    this.inputBuffer = this.inputBuffer.slice(inputIndex);
  }
}
stopResampling() {
  //emit last ping since intervall won't ping last time at say 800ms
  this.streamEndNotifier$.next();
  this.audioContext.close();
  this.gumStream.getAudioTracks()[0].stop();
  this.inputBuffer = [];
}



}
