import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from "@angular/core";
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  ImodbusData,
  Inumber,
  Iselect,
  IselectOption,
  editableConverters,
} from "@modbus2mqtt/specification.shared";
import { Observable, Subscription } from "rxjs";
import {
  ISpecificationMethods,
  ImodbusEntityWithName,
} from "../../services/specificationInterface";
import { MatSlideToggle } from "@angular/material/slide-toggle";
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { MatInput } from "@angular/material/input";
import { MatFormField, MatLabel, MatError } from "@angular/material/form-field";
import { NgIf, NgFor } from "@angular/common";

@Component({
  selector: "app-entity-value-control",
  templateUrl: "./entity-value-control.component.html",
  styleUrl: "./entity-value-control.component.css",
  standalone: true,
  imports: [
    NgIf,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    ReactiveFormsModule,
    MatError,
    MatSelect,
    NgFor,
    MatOption,
    MatSlideToggle,
  ],
})
export class EntityValueControlComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input({ required: true }) entity: ImodbusEntityWithName | undefined;
  @Input({ required: true }) specificationMethods: ISpecificationMethods;
  @Input()
  mqttValueObservable: Observable<ImodbusData | undefined>;
  entityName: string;
  sub: Subscription | undefined;
  constructor() {}
  step:number| undefined = undefined
  min:number| undefined = undefined
  max:number| undefined = undefined
  
  optionsFormControl: FormControl<number | null> = new FormControl(null);
  numberFormControl: FormControl<number | null> = new FormControl(null);
  textFormControl: FormControl<string | null> = new FormControl(null);
  toggleFormControl: FormControl<boolean | null> = new FormControl(null);
  onTextChange(_event: Event) {
    if (this.textFormControl.value && this.entity)
      this.specificationMethods
        .postModbusWriteMqtt(this.entity, this.textFormControl.value.toString())
        .subscribe((newValue) => {
          this.textFormControl.setValue(newValue);
        });
  }
  onNumberChange() {
    if (this.numberFormControl.value && this.entity)
      this.specificationMethods
        .postModbusWriteMqtt(
          this.entity,
          this.numberFormControl.value.toString(),
        )
        .subscribe((newValue) => {
          this.textFormControl.setValue(newValue);
        });
  }
  onButton() {
    if (this.toggleFormControl.value && this.entity) {
      let val = this.toggleFormControl.value ? "ON" : "OFF";
      this.specificationMethods
        .postModbusWriteMqtt(this.entity, val)
        .subscribe((newValue) => {
          this.toggleFormControl.setValue(newValue == "ON");
        });
    }
  }
  onOptionChange() {
    if (this.entity) {
      let option: IselectOption | undefined = (
        this.entity.converterParameters as Iselect
      ).options!.find((o) => o.key == this.optionsFormControl.value);
      if (option && this.entity)
        this.specificationMethods
          .postModbusWriteMqtt(this.entity, option.name)
          .subscribe((newValue) => {
            let option: IselectOption | undefined = (
              this.entity!.converterParameters as Iselect
            ).options!.find((o) => o.name == newValue);
            if (option) this.optionsFormControl.setValue(option.key);
          });
    }
  }

  ngOnDestroy(): void {
    if (this.sub != undefined) this.sub.unsubscribe();
  }

  isSensor(): boolean {
    return !editableConverters.includes(this.getConverterName());
  }
  getConverterName(): string {
    return this.entity && this.entity.converter && this.entity.converter.name
      ? this.entity.converter.name
      : "sensor";
  }
  getMqttValue(): string | number {
    return this.entity && this.entity.mqttValue != undefined
      ? this.entity.mqttValue
      : "";
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.entity2Form();
  }

  entity2Form() {
    if (this.entity) {
      let s = this.entity.name;
      this.entityName = s ? s : "";
      let fc: FormControl | undefined = undefined;
      switch (this.entity.converter.name) {
        case "number":
          if (this.entity.mqttValue != undefined)
            this.numberFormControl.setValue(this.getMqttValue() as number);
          let num = this.entity.converterParameters as Inumber;
          if(num.step)
            this.step = num.step
          fc = this.numberFormControl;
          fc.clearValidators();
          if (num.identification != undefined && num.identification.min)
            fc.addValidators(Validators.min(num.identification.min));
          if (num.identification != undefined && num.identification.max)
            fc.addValidators(Validators.max(num.identification.max));
          break;
        case "select":
          if (this.entity.modbusValue)
            if (this.entity.readonly) {
              this.optionsFormControl.setValue(this.entity.modbusValue[0]);
              fc = this.optionsFormControl;
            } else {
              this.textFormControl.setValue(
                this.entity.mqttValue != null
                  ? (this.entity.mqttValue as string)
                  : "",
              );
              fc = this.textFormControl;
            }
          break;
        case "text":
          fc = this.textFormControl;
          if (this.entity.mqttValue) fc.setValue(this.getMqttValue());
          break;
        case "binary":
          fc = this.toggleFormControl;
          if (this.entity.mqttValue) fc.setValue(this.entity.mqttValue == "ON");
          break;
        case "value":
      }
      if (fc)
        if (this.getConverterName().indexOf("sensor") >= 0) fc.disable();
        else fc.enable();
    }
  }
  ngOnInit(): void {
    this.entity2Form();
    if (this.mqttValueObservable)
      this.sub = this.mqttValueObservable.subscribe((data) => {
        if (this.entity && data) {
          this.entity.modbusValue = data.modbusValue;
          this.entity.mqttValue = data.mqttValue;
          this.entity.identified = data.identified;
          this.entity2Form();
        }
      });
  }

  getOptions(): IselectOption[] {
    if (this.entity) {
      let options = (this.entity.converterParameters as Iselect).options;
      if (options) return options;
    }
    return [];
  }
}
