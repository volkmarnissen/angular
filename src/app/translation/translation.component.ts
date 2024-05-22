import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { IUpdatei18nText, Imessage, ImodbusSpecification, Iselect,  VariableTargetParameters, getParameterType, getSpecificationI18nText, setSpecificationI18nText, validateTranslation } from 'specification.shared';
import { ApiService } from '../services/api-service';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ISpecificationMethods } from '../services/specificationInterface';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

const originalLanguageFormGroupName = "originalLanguage"
const translationLanguageFormGroupName = "translationLanguage"

@Component({
  selector: 'app-translation',
  templateUrl: './translation.component.html',
  styleUrls: ['./translation.component.css']
})
export class TranslationComponent implements OnInit, OnDestroy {

  @Input()
  specificationObservable: Observable<ImodbusSpecification | null>;
  specificationSubscription: Subscription | undefined = undefined
  @Input({ required: true })
  specificationFormGroup: FormGroup

  @Output()
  updateI18n = new EventEmitter<IUpdatei18nText>()
  @Input()
  mqttdiscoverylanguage: string;
  @Input({ required: true })
  specificationMethods: ISpecificationMethods

  currentSpecification: ImodbusSpecification;
  supportsGoogleTranslate: boolean = true;
  allKeys: string[] = []
  originalLanguages: string[] = []
  translatedLanguages: string[] = []
  translationFormGroupInitialized: boolean = false;
  googleTranslateWindow: Window | null = null
  constructor(private entityApiService: ApiService, private fb: FormBuilder, private router: Router) { }

  translationFormGroup: FormGroup = new FormGroup({});
  originalLanguage: string
  translationLanguage: string
  textBuffer: string[]
  ids: string[]

  ngOnInit() {
    this.specificationFormGroup.setControl("translation", this.translationFormGroup)
    this.translationFormGroup.addControl("name", new FormControl<string | null>(null))
    this.specificationSubscription = this.specificationObservable.subscribe(_specFromParent => {
      if (_specFromParent)
        this.currentSpecification = _specFromParent
      this.translationLanguage = this.mqttdiscoverylanguage
      let enLang = this.currentSpecification.i18n.find(l => l.lang == 'en')
      this.originalLanguage = 'en'
      if (this.mqttdiscoverylanguage != 'en')
        if (enLang == null && this.currentSpecification.i18n.length > 0)
          this.originalLanguage = this.currentSpecification.i18n[0].lang

      this.fillLanguages()
      this.translationFormGroup.setControl("name", new FormControl<string | null>(
        getSpecificationI18nText(this.currentSpecification, this.translationLanguage, "name", true), Validators.required))

      for (let key of this.getAllKeys()) {
        try {
          this.translationFormGroup.addControl(key, new FormControl<string | null>(
            getSpecificationI18nText(this.currentSpecification, this.translationLanguage, key, true), Validators.required))

          this.getOptionKeys(key).forEach(optionKey => this.translationFormGroup.addControl(optionKey, new FormControl<string | null>(
            getSpecificationI18nText(this.currentSpecification, this.translationLanguage, optionKey, true), Validators.required)))
        }
        catch (e) {
          console.log("error")
        }
        this.translationFormGroupInitialized = true;
      }
    });
  }
  showTranslation(): boolean {
    // en should always be availabe. The discovery language is al
    if (null == this.currentSpecification.i18n.find(l => l.lang == 'en'))
      return true;
    let msgs: Imessage[] = []

    // If the discovery language is not available, the translation dialog should be visible.
    if (null == this.currentSpecification.i18n.find(l => l.lang == this.mqttdiscoverylanguage))
      return true;
    // Check translation for completeness
    validateTranslation(this.currentSpecification, this.mqttdiscoverylanguage, msgs);
    return (msgs.length > 0)
  }
  fillLanguages() {
    this.originalLanguages = []
    this.translatedLanguages = []
    this.currentSpecification.i18n.forEach(l => { this.originalLanguages.push(l.lang) })
  }
  ngOnDestroy(): void {
    if (this.specificationSubscription)
      this.specificationSubscription.unsubscribe();
  }
  getKeyType(key: string): string {
    return (key == "name" ? "Spec" : "Entity")
  }
  getOriginalText(key: string): string {
    return getSpecificationI18nText(this.currentSpecification, this.originalLanguage, key, true)!
  }
  changeText(key: string): void {
    let textFc = this.translationFormGroup.get([key])
    if (textFc) {
      let text = textFc.value
      setSpecificationI18nText(this.currentSpecification, this.translationLanguage, key, text)
      this.updateI18n.emit({key:key, i18n:this.currentSpecification.i18n})
    }
  }
  translatedText(key: string): string | null {
    return getSpecificationI18nText(this.currentSpecification, this.translationLanguage, key, true)
  }
  getAllKeys(): string[] {
    let rc: string[] = []
    if (this.currentSpecification)
      this.currentSpecification.entities.forEach(ent => {
        if (!ent.variableConfiguration || ent.variableConfiguration.targetParameter <= VariableTargetParameters.deviceIdentifiers)
          rc.push("e" + ent.id)
      })

    return rc;
  }
  errorHandler(err: HttpErrorResponse): boolean {
    if (err.error.code == 7) {
      // Forward to translation
      this.supportsGoogleTranslate = false;
      return true
    }
    return false
  }
  translatedValuesPasted(event: Event) {
    if (event && event.target) {
      let text: string | null = (event.target as HTMLTextAreaElement).value
      if (text) {
        let texts: string[] = text.split("\n")
        this.copyTranslations2Form(texts);
        (event.target as HTMLTextAreaElement).value = ""
      }
    }
  }
  needsTranslation(): boolean {
    this.generateTranslationTexts()
    return (this.ids.length > 0)
  }
  copyTranslations2Form(texts: string[]) {
    let ids = structuredClone(this.ids)
    let text: string | undefined = texts.pop()
    let id: string | undefined = ids.pop()
    while (text && id) {
      let c: AbstractControl | null
      if (null != (c = this.translationFormGroup.get([id]))) {
        c.setValue(text)
        this.changeText(id)
      }
      text = texts.pop()
      id = ids.pop()
    }
  }
  private generateTranslationTexts() {
    this.ids = []
    this.textBuffer = []

    if (this.currentSpecification && this.currentSpecification.i18n) {
      let lang = this.currentSpecification.i18n.find(l => l.lang == this.originalLanguage)
      let translatedLang = this.currentSpecification.i18n.find(l => l.lang == this.translationLanguage)

      let ids: string[] = []
      if (lang && lang.texts) {
        lang.texts.forEach((t) => {
          if (translatedLang == null || null == translatedLang.texts.find(text => text.textId == t.textId)) {
            this.textBuffer.push(t.text)
            this.ids.push(t.textId)
          }
        })
      }
    }

  }
  googleTranslate() {
    this.generateTranslationTexts()
    if (this.ids.length)
      if (this.supportsGoogleTranslate) {
        this.entityApiService.postTranslate(this.originalLanguage, this.translationLanguage, this.textBuffer, this.errorHandler.bind(this)).subscribe(this.copyTranslations2Form)
      }
      else {
        if (this.textBuffer.length) {
          let url = `https://translate.google.com/?sl=${this.originalLanguage}&hl=${this.translationLanguage}&text=${this.textBuffer.join("%0A")}`
          this.googleTranslateWindow = window.open(url, 'modbus2mqttTranslation');
        }

      }
  }
  getOptionKeys(entityKey: string): string[] {
    let entityId: number = parseInt(entityKey.substring(1))
    let rc: string[] = []
    if (this.currentSpecification) {
      let ent = this.currentSpecification.entities.find(ent => ent.id == entityId)
      if (ent && getParameterType(ent.converter) == "Iselect"){
        let opt = (ent.converterParameters as Iselect).options
        let optm = (ent.converterParameters as Iselect).optionModbusValues
        if( opt && opt.length)
          opt.forEach(opt => rc.push("e" + ent!.id + "o." + opt.key))
        if( optm && optm.length)
          optm.forEach(opt =>{
            let oname = "e" + ent!.id + "o." + opt
            if(! rc.includes( oname))
              rc.push(oname)
        } )
      }
      }
    return rc;
  }
}
