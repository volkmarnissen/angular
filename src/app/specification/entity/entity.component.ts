import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from "@angular/core";

import { ApiService } from "../../services/api-service";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { Observable, Subject, Subscription } from "rxjs";
import {
  EnumNumberFormat,
  IFunctionCode as IRegisterType,
  Iconverter,
  IdentifiedStates,
  Ientity,
  Imessage,
  ImodbusData,
  ImodbusEntity,
  Iname,
  Inumber,
  Iselect,
  IselectOption,
  Itext,
  ModbusRegisterType,
  VariableTargetParameters,
  getFileNameFromName,
  getParameterType,
  setSpecificationI18nEntityName,
} from "@modbus2mqtt/specification.shared";
import { SessionStorage } from "../../services/SessionStorage";
import { M2mErrorStateMatcher } from "../../services/M2mErrorStateMatcher";
import {
  ISpecificationMethods,
  ImodbusEntityWithName,
  isDeviceVariable,
} from "../../services/specificationInterface";
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropList,
  CdkDrag,
} from "@angular/cdk/drag-drop";
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { MatSlideToggle } from "@angular/material/slide-toggle";
import { MatInput } from "@angular/material/input";
import { MatFormField, MatLabel, MatError } from "@angular/material/form-field";
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from "@angular/material/expansion";
import { EntityValueControlComponent } from "../entity-value-control/entity-value-control.component";
import { MatIcon } from "@angular/material/icon";
import { MatTooltip } from "@angular/material/tooltip";
import { MatIconButton } from "@angular/material/button";
import { NgIf, NgClass, NgFor, AsyncPipe } from "@angular/common";
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from "@angular/material/card";

const nameFormControlName = "name";

const optionModbusFormControlName = "optionModbus";
const optionMqttFormControlName = "optionMqtt";
const variableTypeFormControlName = "variableType";
const variableEntityFormControlName = "variableEntity";
const mqttNameFormControlName = "mqttname";

const newEntity: ImodbusEntityWithName = {
  name: "",
  registerType: ModbusRegisterType.HoldingRegister,
  readonly: true,
  modbusValue: [0],
  mqttValue: "",
  identified: IdentifiedStates.unknown,
  converter: {
    name: "number",
    registerTypes: [
      ModbusRegisterType.HoldingRegister,
      ModbusRegisterType.AnalogInputs,
    ],
  },
  modbusAddress: 0,
  id: -1,
};

@Component({
  selector: "app-entity",
  templateUrl: "./entity.component.html",
  styleUrl: "./entity.component.css",
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    NgIf,
    MatIconButton,
    MatTooltip,
    MatIcon,
    NgClass,
    EntityValueControlComponent,
    MatCardContent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSlideToggle,
    MatSelect,
    NgFor,
    MatOption,
    CdkDropList,
    CdkDrag,
    AsyncPipe,
  ],
})
export class EntityComponent
  extends SessionStorage
  implements AfterViewInit, OnChanges, OnDestroy
{
  onMqttValueChange(_event: any, _entity: ImodbusEntity) {
    _event.target.value = "YYYY";
  }
  onMqttKeyPress($event: KeyboardEvent) {
    if (
      !("a" <= $event.key && $event.key <= "z") &&
      !("A" <= $event.key && $event.key <= "Z") &&
      !("0" <= $event.key && $event.key <= "9")
    ) {
      $event.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  onChangeSelectOption() {
    if (this.selectPropertiesFormGroup.valid) console.log("OK");
  }
  @Input({ required: true })
  specificationMethods: ISpecificationMethods;

  @Input()
  entity: ImodbusEntityWithName = structuredClone(newEntity);
  backupEntity: ImodbusEntityWithName | null;
  @Input()
  disabled: boolean = true;
  entityCategories: string[] = ["", "config", "diagnostic"];

  mqttValues: HTMLElement;
  converters: Observable<Iconverter[]>;
  currentLanguage: string;
  mqttValueObservable: Subject<ImodbusData | undefined> = new Subject<
    ImodbusData | undefined
  >();
  specificationSavedObservable: Observable<void>;
  subSpec: Subscription;
  allFormGroups: FormGroup = this.fb.group({});
  entityFormGroup: FormGroup;
  variableFormGroup: FormGroup;
  selectPropertiesFormGroup: FormGroup;
  numberPropertiesFormGroup: FormGroup;
  stringPropertiesFormGroup: FormGroup;
  entityObservable: Observable<ImodbusEntity>;
  registerTypes: IRegisterType[] = [
    {
      registerType: ModbusRegisterType.HoldingRegister,
      name: "Holding Registers",
    },
    { registerType: ModbusRegisterType.AnalogInputs, name: "Analog Input" },
    { registerType: ModbusRegisterType.Coils, name: "Coils" },
  ];

  entitiesDisplayedColumns = [
    "select",
    nameFormControlName,
    "identified",
    "mqttValue",
    "action",
  ];

  constructor(
    private entityApiService: ApiService,
    private fb: FormBuilder,
  ) {
    super();
  }

  ngOnInit(): void {
    this.entityFormGroup = this.fb.group({
      name: [null as string | null, this.entityNameValidator.bind(this)],
      mqttname: [
        null as string | null,
        this.entityMqttNameValidator.bind(this),
      ],
      converter: [null as Iconverter | null, Validators.required],
      modbusAddress: [
        null as number | null,
        Validators.compose([
          Validators.required,
          Validators.min(0),
          Validators.max(65536),
        ]),
      ],
      registerType: [null as IRegisterType | null, Validators.required],
      readonly: [null as boolean | null],
      entityCategory: [""],
      icon: [null as string | null],
      forceUpdate: [false],
    });
    this.variableFormGroup = this.fb.group({
      variableType: [null as VariableTargetParameters | null],
      variableEntity: [
        null as ImodbusEntity | null,
        this.variableEntityValidator.bind(this),
      ],
    });
    (this.numberPropertiesFormGroup = this.fb.group({
      deviceClass: [null as string | null],
      multiplier: [1, Validators.required],
      offset: [0, Validators.required],
      numberFormat: [EnumNumberFormat.default, Validators.required],
      uom: [null as string | null],
      min: [null as string | null],
      max: [null as string | null],
    })),
      (this.stringPropertiesFormGroup = this.fb.group({
        identExpr: [null as string | null],
        stringlength: [null as number | null, Validators.required],
      })),
      (this.selectPropertiesFormGroup = this.fb.group({
        optionModbus: [
          null as number | null,
          Validators.compose([
            Validators.required,
            this.uniqueKeyValidator.bind(this),
          ]),
        ],
        optionMqtt: [
          null as string | null,
          Validators.compose([
            Validators.required,
            this.uniqueNameValidator.bind(this),
          ]),
        ],
        deviceClass: [null as string | null],
      }));
    this.generateEntityCopyToForm();
    if (this.specificationMethods) {
      this.specificationSavedObservable =
        this.specificationMethods.getSaveObservable();
      this.subSpec = this.specificationSavedObservable.subscribe(() => {
        this.backupEntity = null;
        this.allFormGroups.markAsPristine();
      });
    }

    this.allFormGroups.setControl("entity", this.entityFormGroup);
    this.allFormGroups.setControl("variable", this.variableFormGroup);
  }

  ngOnDestroy(): void {
    if (this.subSpec) this.subSpec.unsubscribe();
  }

  ngAfterViewInit() {
    this.converters = this.entityApiService.getConverters();
  }

  private generateEntityCopyToForm() {
    if (this.entity) this.backupEntity = structuredClone(this.entity);
    else {
      this.backupEntity = null;
      this.entity = structuredClone(this.entity);
    }
    this.copyEntityToForm(this.entity!);
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.generateEntityCopyToForm();
  }

  private copyEntityToForm(entity: ImodbusEntityWithName) {
    if (!this.entityFormGroup) return;
    let converterFormControl = this.entityFormGroup.get("converter")!;
    let modbusAddressFormControl = this.entityFormGroup.get("modbusAddress")!;

    if (this.disabled) {
      this.entityFormGroup.disable();
      this.numberPropertiesFormGroup.disable();
      this.stringPropertiesFormGroup.disable();
      this.variableFormGroup.disable();
      this.selectPropertiesFormGroup.disable();
    } else {
      this.entityFormGroup.enable();
      this.numberPropertiesFormGroup.enable();
      this.stringPropertiesFormGroup.enable();
      this.variableFormGroup.enable();
      this.selectPropertiesFormGroup.enable();
      this.entityFormGroup.get(mqttNameFormControlName)?.setErrors(null);
      let entityFormGroup = this.entityFormGroup!;
      let vt = this.variableFormGroup.get(variableTypeFormControlName)!.value;
      if (vt && vt != 0) entityFormGroup.get("name")?.disable();
      entityFormGroup.get(mqttNameFormControlName)?.setErrors(null);
    }
    this.variableFormGroup
      .get(variableTypeFormControlName)!
      .setValue(
        entity.variableConfiguration
          ? entity.variableConfiguration.targetParameter
          : null,
      );
    this.variableFormGroup
      .get(variableEntityFormControlName)!
      .setValue(
        entity.variableConfiguration && entity.variableConfiguration.entityId
          ? entity.variableConfiguration.entityId
          : null,
      );
    if (
      this.variableFormGroup.get(variableTypeFormControlName)!.value != null &&
      this.variableFormGroup.get(variableTypeFormControlName)!.value != 0
    ) {
      this.entityFormGroup.get(nameFormControlName)!.disable();
      this.entityFormGroup.get(nameFormControlName)!.setValue(null);

      if (
        isDeviceVariable(
          this.variableFormGroup.get(variableTypeFormControlName)!.value,
        )
      )
        this.variableFormGroup.get(variableEntityFormControlName)!.disable();
      else this.variableFormGroup.get(variableEntityFormControlName)!.enable();
    } else {
      // This entity is no variable
      if (!this.disabled)
        this.entityFormGroup.get(nameFormControlName)!.enable();
      this.entityFormGroup.get(nameFormControlName)!.setValue(entity.name);
      if (entity.mqttname)
        this.entityFormGroup
          .get(mqttNameFormControlName)!
          .setValue(entity.mqttname);
      else if (this.entityFormGroup.get(mqttNameFormControlName)!.value != null)
        this.entityFormGroup
          .get(mqttNameFormControlName)!
          .setValue(
            getFileNameFromName(
              this.entityFormGroup.get(nameFormControlName)!.value,
            ),
          );
      this.variableFormGroup.get(variableEntityFormControlName)!.disable();
      delete entity.variableConfiguration;
    }

    this.entityFormGroup.get("icon")!.setValue(entity.icon);
    this.entityFormGroup.get("forceUpdate")!.setValue(entity.forceUpdate);
    this.entityFormGroup.get("entityCategory")!.setValue(entity.entityCategory);
    this.entityFormGroup.get("readonly")!.setValue(entity.readonly);
    this.entityFormGroup
      .get("registerType")!
      .setValue(this.getFunctionCode(entity.registerType));
    converterFormControl.setValue(entity.converter);
    modbusAddressFormControl.setValue(
      entity.modbusAddress != undefined ? entity.modbusAddress : null,
    );

    if (
      converterFormControl.value !== entity.converter ||
      modbusAddressFormControl.value !== entity.modbusAddress
    ) {
      converterFormControl.setValue(
        entity.converter !== undefined ? entity.converter : null,
      );
      modbusAddressFormControl.setValue(
        entity.modbusAddress && entity.modbusAddress != -1
          ? entity.modbusAddress
          : null,
      );
    }

    if (!entity.converterParameters) {
      entity.converterParameters = {};
    }
    let converterParameters = entity.converterParameters;
    switch (this.getParameterTypeFromConverterFormControl()) {
      case "Inumber":
        this.allFormGroups.setControl(
          "properties",
          this.numberPropertiesFormGroup,
        );

        let np = converterParameters as Inumber;
        this.numberPropertiesFormGroup
          .get("multiplier")!
          .setValue(np.multiplier ? np.multiplier : 1);
        this.numberPropertiesFormGroup
          .get("offset")!
          .setValue(np.offset ? np.offset : 0);
        this.numberPropertiesFormGroup
          .get("deviceClass")!
          .setValue(np.device_class ? np.device_class : null);
        this.numberPropertiesFormGroup
          .get("uom")!
          .setValue(np.uom ? np.uom : null);
        this.numberPropertiesFormGroup
          .get("numberFormat")!
          .setValue(
            np.numberFormat !== undefined
              ? np.numberFormat
              : EnumNumberFormat.default,
          );
        this.numberPropertiesFormGroup
          .get("min")!
          .setValue(
            np.identification && np.identification.min !== undefined
              ? np.identification.min
              : null,
          );
        this.numberPropertiesFormGroup
          .get("max")!
          .setValue(
            np.identification && np.identification.max !== undefined
              ? np.identification.max
              : null,
          );
        break;
      case "Itext":
        this.allFormGroups.setControl(
          "properties",
          this.stringPropertiesFormGroup,
        );
        let nt = converterParameters as Itext;
        this.stringPropertiesFormGroup
          .get("stringlength")!
          .setValue(nt.stringlength ? nt.stringlength : 10);
        this.stringPropertiesFormGroup
          .get("identExpr")!
          .setValue(nt.identification ? nt.identification : null);
        break;
      case "Iselect":
        this.allFormGroups.setControl(
          "properties",
          this.selectPropertiesFormGroup,
        );
        //(this.selectedEntity.converterParameters as Iselect).options = (converterParameters as Iselect).options;
        switch (converterFormControl.value) {
          case "button":
          case "binary_sensor":
            // default options for binary sensor
            let nb = converterParameters as Iselect;
            nb.options = [
              { key: 0, name: "ON" },
              { key: 1, name: "OFF" },
            ];
            this.selectPropertiesFormGroup
              .get("deviceClass")!
              .setValue(nb.device_class ? nb.device_class : null);
            break;
          default:
        }
    }
    this.entity.valid = this.canSaveEntity();
  }

  getParameterTypeFromConverterFormControl(): string | undefined {
    let converterFormControl = this.entityFormGroup.get("converter")!;
    return getParameterType(converterFormControl.value);
  }

  getCurrentOptions(): IselectOption[] {
    if (
      this.entity &&
      this.entity.converterParameters &&
      (this.entity.converterParameters as Iselect).options
    )
      return (this.entity.converterParameters as Iselect).options!;
    return [];
  }
  isTouched(): boolean {
    if (!this.entityFormGroup.pristine) return true;
    if (!this.variableFormGroup!.pristine) return true;
    switch (this.getParameterTypeFromConverterFormControl()) {
      case "Iselect":
        if (!this.backupEntity) return true;
        let eo = JSON.stringify(
          (this.entity.converterParameters as Iselect).options,
        );
        let bo = JSON.stringify(
          (this.backupEntity.converterParameters as Iselect).options,
        );
        return eo != bo;

      case "Itext":
        return !this.stringPropertiesFormGroup.pristine;
      case "Inumber":
        return !this.numberPropertiesFormGroup.pristine;
      default:
        return false;
    }
  }
  readFromModbus() {
    this.specificationMethods
      .postModbusEntity(this.entity)
      .subscribe((data) => {
        this.mqttValueObservable.next(data);
      });
  }
  isCurrentMessage(): boolean {
    if (this.specificationMethods == undefined) return false;
    return (
      this.specificationMethods.getCurrentMessage()?.referencedEntity ==
      this.entity.id
    );
  }
  onEntityNameValueChange() {
    // set mqtt name in form control,
    // read variable configuration and set values accordingly.
    // No impact on modbus values
    // set entity.name, entity.mqttname and entity.variableConfiguration
    if (!this.entity) return;
    this.specificationMethods.setEntitiesTouched();
    let vt = this.variableFormGroup.get(variableTypeFormControlName);
    if (vt != null && vt.value != null && Number.parseInt(vt.value) != 0) {
      this.entity.variableConfiguration = {
        targetParameter: this.variableFormGroup.get(
          variableTypeFormControlName,
        )!.value,
        entityId:
          this.variableFormGroup.get(variableEntityFormControlName)!.value ==
          null
            ? undefined
            : this.variableFormGroup.get(variableEntityFormControlName)!.value
                .id,
      };
      if (!isDeviceVariable(vt.value))
        this.variableFormGroup.get(variableEntityFormControlName)!.disable();
      else this.variableFormGroup.get(variableEntityFormControlName)!.enable();
      this.entity.name = undefined;
      this.entityFormGroup.get(nameFormControlName)!.setValue(null);
      this.entityFormGroup.get(nameFormControlName)!.disable();
      this.entityFormGroup.get(mqttNameFormControlName)!.setValue(null);
      this.entityFormGroup.get(mqttNameFormControlName)!.disable();
    } else {
      this.variableFormGroup.get(variableEntityFormControlName)!.disable();
      this.entityFormGroup.get(nameFormControlName)!.enable();
      delete this.entity.variableConfiguration;
      if (
        this.entityFormGroup.get(nameFormControlName)!.value != null &&
        this.entityFormGroup.get(nameFormControlName)!.value != "N/A"
      ) {
        this.entity.name = this.entityFormGroup.get(nameFormControlName)!.value;
      }

      let mqttname: string | undefined | null = this.entityFormGroup.get(
        mqttNameFormControlName,
      )!.value;
      if (mqttname && mqttname.length > 0)
        this.entity.mqttname = mqttname.toLowerCase();
      else if (this.entity.name)
        this.entity.mqttname = getFileNameFromName(this.entity.name);

      this.entityFormGroup
        .get(mqttNameFormControlName)!
        .setValue(this.entity.mqttname != null ? this.entity.mqttname : null);
    }
    this.specificationMethods.copy2Translation(this.entity);
  }
  onModbusAddressChange() {
    if (!this.entity) return;
    this.specificationMethods.setEntitiesTouched();
    let modbusAddressFormControl = this.entityFormGroup.get("modbusAddress")!;
    let converterFormControl = this.entityFormGroup.get("converter")!;

    if (
      (modbusAddressFormControl.value != null &&
        modbusAddressFormControl.value !== this.entity.modbusAddress) ||
      (converterFormControl.value != null &&
        converterFormControl.value !== this.entity.converter)
    ) {
      this.entity.modbusAddress =
        modbusAddressFormControl.value != null
          ? modbusAddressFormControl.value
          : undefined;
      if (converterFormControl.value !== null) {
        this.entity.converter = converterFormControl.value as Iconverter;
      }
    }
    this.entity.registerType =
      this.entityFormGroup.get("registerType")!.value != null
        ? this.entityFormGroup.get("registerType")!.value.registerType
        : (this.entity.registerType = ModbusRegisterType.HoldingRegister);

    if (this.entity.registerType == ModbusRegisterType.AnalogInputs) {
      this.entityFormGroup.get("registerType");
      this.entity.readonly = true;
      this.entityFormGroup.get("readonly")?.disable();
      this.entityFormGroup.get("readonly")?.setValue(true);
    } else {
      this.entityFormGroup.get("readonly")?.enable();
    }
    this.entity.readonly = true;
    this.readFromModbus();
  }
  isAnalogInput(): boolean {
    return this.entity.registerType == ModbusRegisterType.AnalogInputs;
  }
  form2Entity() {
    // copies all values which are not relevant to
    // this.saveButton.disabled = !this.canSaveEntity(entity)
    if (!this.entity) return;
    this.specificationMethods.setEntitiesTouched();
    if (this.entityFormGroup.get("icon")!.value != null)
      this.entity.icon = this.entityFormGroup.get("icon")!.value;
    if (this.entityFormGroup.get("forceUpdate")!.value != null)
      this.entity.forceUpdate = this.entityFormGroup.get("forceUpdate")!.value;
    if (this.entityFormGroup.get("readonly")!.value != null)
      this.entity.readonly = this.entityFormGroup.get("readonly")!.value;
    if (
      this.entityFormGroup.get("entityCategory")!.value != null &&
      this.entityFormGroup.get("entityCategory")!.value.length > 0
    )
      this.entity.entityCategory =
        this.entityFormGroup.get("entityCategory")!.value;
    else delete this.entity.entityCategory;
    switch (this.getParameterTypeFromConverterFormControl()) {
      case "Inumber":
        if (this.numberPropertiesFormGroup.get("deviceClass")!.value != null)
          (this.entity.converterParameters as Inumber).device_class =
            this.numberPropertiesFormGroup.get("deviceClass")!.value;
        if (this.numberPropertiesFormGroup.get("uom")!.value != null)
          (this.entity.converterParameters as any).uom =
            this.numberPropertiesFormGroup.get("uom")!.value;
        break;
    }
    this.setEntitiesTouched();
  }
  onConverterValueChange() {
    this.onConverterValueChangeLocal();
    this.readFromModbus();
  }
  updateReadonly() {
    let category = this.entityFormGroup.get("entityCategory")!.value;
    switch (category) {
      case "diagnostic":
        this.entityFormGroup.get("readonly")!.setValue(true);
        break;
      case "config":
        this.entityFormGroup.get("readonly")!.setValue(false);
        break;
      default:
        break;
    }
  }
  updateCategory() {
    let category = this.entityFormGroup.get("entityCategory")!.value;
    if (category && category.length) {
      category = this.entityFormGroup.get("readonly")!.value
        ? "diagnostic"
        : "config";
      this.entityFormGroup.get("entityCategory")!.setValue(category);
    }
  }

  private onConverterValueChangeLocal() {
    this.specificationMethods.setEntitiesTouched();
    switch (this.getParameterTypeFromConverterFormControl()) {
      case "Inumber":
        this.allFormGroups.setControl(
          "properties",
          this.numberPropertiesFormGroup,
        );
        this.entity.converterParameters = {};
        if (this.numberPropertiesFormGroup.get("multiplier")!.value != null)
          (this.entity.converterParameters as any).multiplier =
            this.numberPropertiesFormGroup.get("multiplier")!.value;
        else (this.entity.converterParameters as any).multiplier = 1;

        if (this.numberPropertiesFormGroup.get("offset")!.value != null)
          (this.entity.converterParameters as any).offset =
            this.numberPropertiesFormGroup.get("offset")!.value;
        else (this.entity.converterParameters as any).offset = 0;
        if (this.numberPropertiesFormGroup.get("numberFormat")!.value != null)
          (this.entity.converterParameters as Inumber).numberFormat =
            this.numberPropertiesFormGroup.get("numberFormat")!.value;
        let min = this.numberPropertiesFormGroup.get("min")!.value;
        let max = this.numberPropertiesFormGroup.get("max")!.value;
        if (min !== null && max !== null) {
          (this.entity.converterParameters as Inumber).identification = {
            min: min,
            max: max,
          };
        }
        break;
      case "Itext":
        this.allFormGroups.setControl(
          "properties",
          this.stringPropertiesFormGroup,
        );
        this.entity.converterParameters = {};
        let strlenFormControl =
          this.stringPropertiesFormGroup.get("stringlength");
        if (strlenFormControl && strlenFormControl.value != null)
          (this.entity.converterParameters as any).stringlength =
            strlenFormControl.value;
        if (this.stringPropertiesFormGroup.get("identExpr")! !== null) {
          (this.entity.converterParameters as any).identification =
            this.stringPropertiesFormGroup.get("identExpr")!.value;
        }
        break;
      case "Iselect":
        this.allFormGroups.setControl(
          "properties",
          this.selectPropertiesFormGroup,
        );
        if (!this.entity.converterParameters)
          this.entity.converterParameters = { options: [] };
        break;
    }
  }

  onSaveEntity() {
    this.form2Entity();
    if (this.entity) {
      delete (this.entity as any)["isNew"];
      this.onConverterValueChange();
    }
  }
  canSaveEntity(): boolean {
    if (!this.entity) return false;

    let entityFormGroup = this.entityFormGroup!;
    let parameterValid = false;
    switch (this.getParameterTypeFromConverterFormControl()) {
      case "Inumber":
        parameterValid = this.numberPropertiesFormGroup.valid;
        break;
      case "Iselect":
        if (
          this.entity &&
          this.entity.converterParameters &&
          (this.entity.converterParameters as Iselect).options
        )
          parameterValid =
            (this.entity.converterParameters as Iselect)!.options!.length > 0;
        break;
      case "Itext":
        parameterValid = this.stringPropertiesFormGroup.valid;
        break;
      default:
        parameterValid = true;
    }
    return (
      parameterValid && entityFormGroup.valid && this.variableFormGroup.valid
    );
  }

  restoreEntity(): void {
    if (this.backupEntity) {
      this.entity = this.backupEntity;
      this.copyEntityToForm(this.entity);
      this.entityFormGroup.markAsPristine();
    } else {
      this.entity = newEntity;
    }
  }

  addEntity() {
    this.specificationMethods.addEntity(this.entity);
    this.entity = structuredClone(newEntity);
    this.copyEntityToForm(this.entity);
  }

  isNewEntity(entity: Ientity): boolean {
    return entity.id == -1;
  }

  copyEntity() {
    this.specificationMethods.addEntity(this.entity);
  }
  nameListCompare = (o1: any, o2: any) => {
    return o1.name === o2.name;
  };

  private isUniqueEntityName(
    cmparray: Iname[],
    inp: FormControl<string | null>,
    list?: FormControl<Iname[] | null>,
  ) {
    let found = cmparray.find((val) => {
      return (
        val.name === inp.value &&
        (list === null ||
          list === undefined ||
          -1 ==
            (list as FormControl<Iname[]>).value.findIndex((v) => {
              return v.name === inp.value;
            }))
      );
    });
    if (found) return false;
    return true;
  }
  private createUniqueNameValidator(
    inp: FormControl<string | null>,
    fn: () => Iname[],
    list?: FormControl<Iname[] | null>,
  ): ValidatorFn {
    return (_control: AbstractControl): ValidationErrors | null => {
      return !this.isUniqueEntityName(fn(), inp, list)
        ? { unique: true }
        : null;
    };
  }

  private uniqueNameValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    {
      return this.entity.converter.name != "select" ||
        undefined ==
          this.getCurrentOptions().find((opt) => opt.name == control.value)
        ? null
        : { unique: control.value };
    }
  };

  private uniqueKeyValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    {
      return undefined ==
        this.getCurrentOptions().find((opt) => opt.key == control.value)
        ? null
        : { unique: control.value };
    }
  };

  private entityNameValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (this.variableFormGroup) {
      let vtc = this.variableFormGroup!.get(variableTypeFormControlName);
      return (this.entity && vtc!.value != null) ||
        (control.value != null && control.value.length > 0)
        ? null
        : { required: control.value };
    }

    return { invalid: control.value };
  };

  private entityMqttNameValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (this.variableFormGroup && this.entity && this.specificationMethods) {
      let vtc = this.variableFormGroup!.get(variableTypeFormControlName);
      let found = this.specificationMethods
        .getMqttNames(this.entity.id)
        .find((mqttname) => mqttname && mqttname == control.value);
      if (found) {
        return { unique: control.value };
      }
      return (this.entity && vtc!.value != null) ||
        (control.value != null && control.value.length > 0)
        ? null
        : { required: control.value };
    }

    return { invalid: control.value };
  };

  selectOptionsValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    {
      return (this.entity?.converterParameters as Iselect).options &&
        (this.entity?.converterParameters as Iselect).options!.length > 0
        ? null
        : { empty: control.value };
    }
  };

  variableEntityValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (!this.variableFormGroup) return null;
    let vt = this.variableFormGroup.get(variableTypeFormControlName)!;
    // variables for devices don't need entity
    if (isDeviceVariable(vt.value)) return null;

    if (control == null || control.value == null || control.value.id == null)
      return { invalid: control.value };

    return this.specificationMethods.hasDuplicateVariableConfigurations(
      control.value.id,
      vt.value,
    )
      ? { unique: control.value }
      : null;
  };

  errorStateMatcher = new M2mErrorStateMatcher();

  getIdentifiedIcon(ent: Ientity): string {
    switch ((ent as ImodbusEntity).identified) {
      case IdentifiedStates.identified:
        return "check";
      case IdentifiedStates.notIdentified:
        return "cancel";
      default:
        return "";
    }
  }
  getIdentifiedText(ent: Ientity): string {
    switch ((ent as ImodbusEntity).identified) {
      case IdentifiedStates.identified:
        return "modbus value matches with configuration";
      case IdentifiedStates.notIdentified:
        return "modbus value does NOT match with configuration";
      default:
        return "";
    }
  }

  isConverterSelected() {
    return this.entityFormGroup.get("converter")!.value != null;
  }
  getMqttValue(rc: ImodbusEntity): string {
    if (rc)
      if (rc.converter.name === "number" && rc.mqttValue) {
        return (rc.mqttValue as number).toString();
      } else return rc.mqttValue as string;
    return "N/A";
  }

  getModbusValue(rc: ImodbusEntity): string {
    if (rc && rc.modbusValue) return rc.modbusValue.toString();
    return "N/A";
  }

  getDeviceClasses(): string[] {
    if (this.getParameterTypeFromConverterFormControl())
      return this.getParameterTypeFromConverterFormControl() ===
        "Ibinary_sensor" ||
        this.getParameterTypeFromConverterFormControl() === "Iselect"
        ? EntityComponent.deviceClasses.binary_sensor
        : EntityComponent.deviceClasses.sensor;
    else return [];
  }
  compareIConverters(c1: Iconverter, c2: Iconverter): boolean {
    return c1 != null && c2 != null && c1.name === c2.name;
  }
  compareFunctionCodes(f1: IRegisterType, f2: IRegisterType) {
    return f1 && f2 && f1.registerType == f2.registerType;
  }

  compareNumber(f1: number, f2: number) {
    return f1 == f2;
  }

  compareEntities(f1: Ientity, f2: Ientity) {
    return f1 && f2 && f1.id == f2.id;
  }

  getFunctionCode(functionCode: ModbusRegisterType | undefined): IRegisterType {
    let rc: IRegisterType | undefined = undefined;
    if (functionCode)
      rc = this.registerTypes.find((fc) => fc.registerType == functionCode);
    if (rc) return rc;
    return this.registerTypes[0];
  }

  addOption() {
    if (this.canAddOption()) {
      this.specificationMethods.setEntitiesTouched();
      let selectPropertiesForm = this.selectPropertiesFormGroup;
      if (this.selectPropertiesFormGroup.valid && this.entity) {
        if ((this.entity.converterParameters as Iselect).options == undefined)
          (this.entity.converterParameters as Iselect).options = [];

        let modbusValue: number | undefined;
        modbusValue = selectPropertiesForm.get(
          optionModbusFormControlName,
        )!.value;
        if (modbusValue != undefined && modbusValue != null) {
          let idx = (
            this.entity.converterParameters as Iselect
          ).options!.findIndex((o) => o.key > modbusValue!);
          if (idx >= 0)
            (this.entity.converterParameters as Iselect).options!.splice(
              idx,
              0,
              {
                key: modbusValue,
                name: selectPropertiesForm.get(optionMqttFormControlName)!
                  .value,
              },
            );
          else
            (this.entity.converterParameters as Iselect).options!.push({
              key: modbusValue,
              name: selectPropertiesForm.get(optionMqttFormControlName)!.value,
            });

          this.readFromModbus();
        }
        this.entity = structuredClone(this.entity);
      }
    }
  }
  setEntitiesTouched() {
    this.specificationMethods.setEntitiesTouched();
  }
  dropOptions(event: CdkDragDrop<any, any, any>) {
    moveItemInArray(
      (this.entity.converterParameters as Iselect).options!,
      event.previousIndex,
      event.currentIndex,
    );
    this.specificationMethods.setEntitiesTouched();
  }

  canAddOption() {
    this.selectPropertiesFormGroup
      .get(["optionModbus"])
      ?.updateValueAndValidity();
    this.selectPropertiesFormGroup
      .get(["optionMqtt"])
      ?.updateValueAndValidity();
    return this.selectPropertiesFormGroup.valid;
  }
  deleteOption(option: IselectOption) {
    this.specificationMethods.setEntitiesTouched();
    // delete name
    let idx = this.getCurrentOptions().findIndex(
      (opt) => opt.key == option.key,
    );
    if (idx >= 0) this.getCurrentOptions().splice(idx, 1);
    if (this.entity) {
      if (this.entity.modbusValue[0] == option.key) this.readFromModbus();
      else {
        this.copyEntityToForm(this.entity);
      }
      this.allFormGroups.markAsDirty();
    }
  }
  static deviceClasses = {
    binary_sensor: [
      "None",
      "connectivity",
      "power",
      "problem",
      "running",
      "safety",
      "update",
    ],
    sensor: [
      "None",
      "apparent_power",
      "atmospheric_pressure",
      "current",
      "data_rate",
      "data_size",
      "date",
      "distance",
      "duration",
      "energy",
      "energy_storage",
      "enum",
      "frequency",
      "gas",
      "humidity",
      "pm1",
      "pm25",
      "pm10",
      "power_factor",
      "power",
      "precipitation",
      "precipitation_intensity",
      "pressure",
      "reactive_power",
      "signal_strength",
      "speed",
      "temperature",
      "timestamp",
      "voltage",
      "volume",
      "volume_storage",
      "water",
      "weight",
    ],
  };
}
