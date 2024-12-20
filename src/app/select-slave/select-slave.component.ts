import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import {MatListModule} from '@angular/material/list';

import { ApiService } from "../services/api-service";
import {
  getCurrentLanguage,
  IbaseSpecification,
  getSpecificationI18nName,
  SpecificationStatus,
  IdentifiedStates,
  getSpecificationI18nEntityName,
  ImodbusEntity,
  ImodbusSpecification,
} from "@modbus2mqtt/specification.shared";
import { Clipboard } from "@angular/cdk/clipboard";
import { Observable, Subscription, map } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { SessionStorage } from "../services/SessionStorage";
import { M2mErrorStateMatcher } from "../services/M2mErrorStateMatcher";
import { MatTreeModule } from "@angular/material/tree";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";

import {
  Islave,
  IidentificationSpecification,
  IBus,
  getConnectionName,
  PollModes,
  Slave,
  Iconfiguration,
  IEntityCommandTopics,
} from "@modbus2mqtt/server.shared";
import { MatInput } from "@angular/material/input";
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  

} from "@angular/material/expansion";
import { MatOption } from "@angular/material/core";
import { MatSelect, MatSelectChange } from "@angular/material/select";
import { MatFormField, MatLabel, MatError } from "@angular/material/form-field";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from "@angular/material/card";
import { MatIconButtonSizesModule } from "mat-icon-button-sizes";

import { NgFor, NgIf, AsyncPipe } from "@angular/common";
import { MatTooltip } from "@angular/material/tooltip";
import { MatSlideToggle } from "@angular/material/slide-toggle";


interface IuiSlave {
  slave: Islave;
  label: string;
  specsObservable: Observable<IidentificationSpecification[]>;
  specs?:IidentificationSpecification[];
  slaveForm: FormGroup;
  commandEntities?: ImodbusEntity[];
  stateTopic?: string;
  statePayload?: string;
  selectedEntitites?:any; 
}

@Component({
  selector: "app-select-slave",
  templateUrl: "./select-slave.component.html",
  styleUrls: ["./select-slave.component.css"],
  standalone: true,
  imports: [
    MatSlideToggle,
    MatTooltip,
    FormsModule,
    ReactiveFormsModule,
    NgFor,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatIconButton,
    MatTreeModule,
    MatIconModule,
    MatIconButtonSizesModule,
    MatButtonModule,
    MatIcon,
    NgIf,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatListModule,
    MatSelect,
    MatOption,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatInput,
    MatError,
    AsyncPipe,
  ],
})
export class SelectSlaveComponent extends SessionStorage implements OnInit {
  getDetectSpecToolTip(): string {
    return this.slaveNewForm.get("detectSpec")?.value == true
      ? "If there is exactly one specification matching to the modbus data for this slave, " +
          "the specification will be selected automatically"
      : "Please set the specification for the new slave after adding it";
  }
  keyDown(event: Event, fg: FormGroup) {
    if ((event.target as HTMLInputElement).name == "slaveId") this.addSlave(fg);
    event.preventDefault();
  }

  getSpecIcon() {
    throw new Error("Method not implemented.");
  }
  currentLanguage: string;
  busname: string;
  constructor(
    private _formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private entityApiService: ApiService,
    private routes: Router,
    private clipboard: Clipboard,
  ) {
    super();
  }
  showAllPublicSpecs = new FormControl<boolean>(false);
  uiSlaves: IuiSlave[] = [];
  config:Iconfiguration;
  slaves: Islave[] = [];
  
  // label:string;
  // slaveForms: FormGroup[]
  // specs:Observable<IidentificationSpecification[]> []=[]
  //slavesFormArray: FormArray<FormGroup>
  slaveNewForm: FormGroup = this._formBuilder.group({
    slaveId: [null],
    detectSpec: [true],
  });
  paramsSubscription: Subscription;
  errorStateMatcher = new M2mErrorStateMatcher();

  entitiesAccessor = (node: IidentificationSpecification) =>
    node.entities ?? [];
  hasChild = (_: number, node: IidentificationSpecification) =>
    !!node.entities && node.entities.length > 0;

  bus: IBus;
  preselectedSlaveId: number | undefined = undefined;
  @ViewChild("slavesBody") slavesBody: ElementRef;
  @Output() slaveidEventEmitter = new EventEmitter<number | undefined>();
  ngOnInit(): void {
    this.entityApiService.getConfiguration().subscribe(config =>{
      this.config = config
      this.currentLanguage = getCurrentLanguage(navigator.language);
      this.paramsSubscription = this.route.params.subscribe((params) => {
        let busId = +params["busid"];
        this.entityApiService.getBus(busId).subscribe((bus) => {
          this.bus = bus;
          if (this.bus) {
            this.busname = getConnectionName(this.bus.connectionData);
            this.updateSlaves(bus);          
          }
        });
      })
    });
  }
  private fillSpecs(
    detectSpec: boolean | undefined,
    uiSlave: IuiSlave,
    slave: Islave,
    spec: IidentificationSpecification[],
  ): IidentificationSpecification[] {
    let fc: FormControl = uiSlave.slaveForm.get(["ispecs"]) as FormControl;
    let slaveSpec = spec.find((s) => s.configuredSlave != undefined);
    let identifiedCount = 0;
    let ispec: IidentificationSpecification | null = null;
    if (detectSpec) {
      if (!slaveSpec) {
        spec.forEach((s) => {
          if (s.identified == IdentifiedStates.identified) {
            identifiedCount++;
            ispec = s;
          }
        });
        if (identifiedCount == 1 && ispec != null) {
          slave.specificationid = (
            ispec as IidentificationSpecification
          ).filename;
          fc.setValue(ispec);
        }
      }
    }
    fc.setValue(slaveSpec);
    return spec;
  }
  private updateSlaves(bus: IBus, detectSpec?: boolean) {
    this.entityApiService.getSlaves(this.bus.busId).subscribe((slaves) => {
      this.uiSlaves = [];
      slaves.forEach((s) => {
        this.uiSlaves.push(this.getUiSlave(s, detectSpec));
      });
      this.generateSlavesArray();
    });
  }
  private generateSlavesArray(): void {
    this.slaves = [];
    this.uiSlaves.forEach((uis) => {
      this.slaves.push(uis.slave);
    });
  }

  getTopicAndPayloadForUiSlave(
    uiSlave:IuiSlave,
    iident: IidentificationSpecification[],
  ): any {
    let o: any = {};

      o.commandTopics = [];
      if(!uiSlave.slave || (uiSlave.slave as Islave).specification == undefined)
        return {};
      let slave = uiSlave.slave;
      let s = iident.find(i=>i.filename == slave.specificationid)
      // No specification
      if( !s)
        return{}
      if (s) {
        let sl = new Slave(this.bus.busId,uiSlave.slave,this.config.mqttbasetopic)
        o.stateTopic = this.getRootUrl(uiSlave.slaveForm) + sl.getStateTopic();
        o.commandTopic = this.getRootUrl(uiSlave.slaveForm) + sl.getCommandTopic();
        o.statePayload = sl.getStatePayload(s.entities);
        o.triggerPollTopic = sl.getTriggerPollTopic();
        s.entities.forEach((ent) => {
          let cmdTopic:IEntityCommandTopics = sl.getEntityCommandTopic(ent)!
          if( cmdTopic )
          {
            cmdTopic.commandTopic = this.getRootUrl(uiSlave.slaveForm) + cmdTopic.commandTopic
            o.commandTopics!.push(cmdTopic);
          }
        });
      }
    return o;
  }
  getSpecs(slave: Islave, detectSpec: boolean | undefined, uiSlave:IuiSlave):Observable<IidentificationSpecification[]>{
    return this.entityApiService
        .getSpecsForSlave(
          this.bus!.busId!,
          slave.slaveid,
          this.showAllPublicSpecs.value!,
        )
        .pipe(
          map((iident) => {
            uiSlave.specs = iident
            return this.fillSpecs.bind(this)(detectSpec, uiSlave, slave, iident);
          }),
        )
  }
  getUiSlave(slave: Islave, detectSpec: boolean | undefined): IuiSlave {
    let fg = this.initiateSlaveControl(slave, null);
    let rc:IuiSlave = {
      slave: slave,
      label: this.getSlaveName(slave),
      slaveForm: fg,
      selectedEntitites: this.getSelectedEntites(slave)
    } as any;
    rc.specsObservable= this.getSpecs(slave,detectSpec,rc)
    return rc;
  }
  updateUiSlaves(slave: Islave, detectSpec: boolean | undefined): void {
    let idx = this.uiSlaves.findIndex((s) => s.slave.slaveid == slave.slaveid);
    if (idx >= 0) this.uiSlaves[idx] = this.getUiSlave(slave, detectSpec);
    else this.uiSlaves.push(this.getUiSlave(slave, detectSpec));
  }
  updateUiSlaveData(slave: Islave): void {
    let idx = this.uiSlaves.findIndex((s) => s.slave.slaveid == slave.slaveid);

    if (idx >= 0) {
      this.uiSlaves[idx].slave = slave;
      this.uiSlaves[idx].label = this.getSlaveName(slave);
    }
  }
  ngOnDestroy(): void {
    this.paramsSubscription.unsubscribe();
  }

  showUnmatched() {
    this.showAllPublicSpecs.value;
    this.updateSlaves(this.bus, false);
  }
  compareSpecificationIdentification(
    o1: IidentificationSpecification,
    o2: IidentificationSpecification,
  ) {
    return o1 && o2 && o1.filename == o2.filename;
  }
  identifiedTooltip(identified: IdentifiedStates | null | undefined): string {
    if (!identified || identified == -1) return "no identification possible";
    if (identified == 1) return "known device";
    return "unknown device";
  }
  identifiedIcon(identified: IdentifiedStates | null | undefined): string {
    if (!identified || identified == -1) return "thumbs_up_down";
    if (identified == 1) return "thumb_up";
    return "thumb_down";
  }
  toSpecification(
    spec: IidentificationSpecification | null | undefined,
  ): ImodbusSpecification | undefined {
    if (spec)
      return {
        filename: spec.filename,
        i18n: spec.i18n,
        status: spec.status,
        files: spec.files,
        entities: spec.entities,
        identified : spec.identified,
      };
    return undefined;
  }
  onSpecificationChange(uiSlave:IuiSlave )
 {
    let spec:IidentificationSpecification = uiSlave.slaveForm.get("ispecs")!.value
    if (uiSlave.slave != null) {
      if (spec == null) {
        delete uiSlave.slave.specification;
        delete uiSlave.slave.specificationid;
      } else {
        uiSlave.slave.specification = this.toSpecification(spec);
        uiSlave.slave.specificationid = spec.filename;
        uiSlave.slave.noDiscoverEntities = []
        uiSlave.selectedEntitites = this.getSelectedEntites(uiSlave.slave)
        uiSlave.slaveForm.get("discoverEntitiesList")!.setValue(this.buildDiscoverEntityList(uiSlave.slave))
        uiSlave.slaveForm.get("noDiscovery")!.setValue(uiSlave.slave.noDiscovery )
      }      
    }
  }
    buildDiscoverEntityList(slave:Islave):number[]{
    let rc:number[] = [];
    if( slave && slave.specification && (slave.specification as ImodbusSpecification).entities)
      (slave.specification as ImodbusSpecification).entities.forEach(e=>{
        if(slave.noDiscoverEntities == undefined  ? true:!slave.noDiscoverEntities.includes( e.id))
          rc.push(e.id)
      })
    return rc
  }
  private slave2Form( slave:Islave, fg:FormGroup){
    fg.get("name")!.setValue((slave.name ? slave.name : null) as string | null)
    fg.get("pollInterval")!.setValue([slave.pollInterval ? slave.pollInterval : 1000] )
    fg.get("pollMode")!.setValue(slave.pollMode == undefined ? PollModes.intervall : slave.pollMode )
    fg.get("qos")!.setValue(slave.qos ?slave.qos: -1 )
    fg.get("noDiscovery")!.setValue(slave.noDiscovery ?slave.noDiscovery: false )
    fg.get("discoverEntitiesList")!.setValue(this.buildDiscoverEntityList(slave) )
    if( slave.noDiscovery )
      fg.get("discoverEntitiesList")!.disable()
    else
      fg.get("discoverEntitiesList")!.enable()
  }

  initiateSlaveControl(
    slave: Islave,
    defaultValue: IidentificationSpecification | null,
  ): FormGroup {
    if (slave.slaveid >= 0){
      let fg =  this._formBuilder.group({
        hiddenSlaveId: [slave.slaveid],
        ispecs: [defaultValue],
        name: [slave.name],
        pollInterval: [slave.pollInterval],
        pollMode: [slave.pollMode],
        qos: [ slave.qos ],
        rootTopic: [ slave.rootTopic],
        showUrl:[false],
        noDiscovery:[false],
        discoverEntitiesList:[[]]
      });
      this.slave2Form(slave,fg )
      return fg
    }
    else
      return this._formBuilder.group({
        slaveId: [null],
        ispecs: [defaultValue],
      });
  }

  hasDuplicateName(slaveId: number, name: string): boolean {
    let rc: boolean = false;
    if (!name) {
      let theSlave = this.uiSlaves.find(
        (s) => s != null && s.slave.slaveid == slaveId,
      );
      if (theSlave && theSlave.slave.specificationid)
        name = theSlave.slave.specificationid;
    }

    this.uiSlaves.forEach((uislave) => {
      if (uislave != null && uislave.slave.slaveid != slaveId) {
        let searchName: string | undefined = uislave.slave.name
          ? uislave.slave.name
          : uislave.slave.specificationid;
        if (searchName == name) rc = true;
      }
    });
    return rc;
  }
  getRootUrl(fg:FormGroup):string{
    if( this.config.rootUrl  &&fg.get("showUrl")!.value as boolean )
      return this.config.rootUrl
    return ""
  }
  getCommandTopic(){

  }

  uniqueNameValidator: any = (
    slaveId: number,
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (this.hasDuplicateName(slaveId, control.value))
      return { duplicates: control.value };
    else return null;
  };

  deleteSlave(slave: Islave | null) {
    if (slave != null && this.bus)
      this.entityApiService
        .deleteSlave(this.bus.busId, slave.slaveid)
        .subscribe(() => {
          let dIdx = this.uiSlaves.findIndex(
            (uis) => uis.slave.slaveid == slave.slaveid,
          );
          if (dIdx >= 0) {
            this.uiSlaves.splice(dIdx, 1);
            this.updateSlaves(this.bus, false);
          }
        });
  }

  getSlaveIdFromForm(newSlaveFormGroup: FormGroup): number {
    let slaveId: string = "";
    if (newSlaveFormGroup) slaveId = newSlaveFormGroup.get("slaveId")!.value;
    return slaveId != undefined && parseInt(slaveId) >= 0
      ? parseInt(slaveId)
      : -1;
  }

  canAddSlaveId(newSlaveFormGroup: FormGroup): boolean {
    let slaveId: number = this.getSlaveIdFromForm(newSlaveFormGroup);
    return (
      slaveId >= 0 &&
      null ==
        this.uiSlaves.find(
          (uis) =>
            uis != null &&
            uis.slave.slaveid != null &&
            uis.slave.slaveid == slaveId,
        )
    );
  }
  addSlave(newSlaveFormGroup: FormGroup): void {
    let slaveId: number = this.getSlaveIdFromForm(newSlaveFormGroup);
    let detectSpec = newSlaveFormGroup.get(["detectSpec"])?.value;
    if (this.canAddSlaveId(newSlaveFormGroup))
      this.entityApiService
        .postSlave(this.bus.busId, { slaveid: slaveId })
        .subscribe(() => {
          this.updateSlaves(this.bus, detectSpec);
        });
  }
  private static form2SlaveSetValue( uiSlave:IuiSlave, controlname:string){
    let val:any = uiSlave.slaveForm.get(controlname)!.value;
    (uiSlave.slave as any)[controlname] = val == null? undefined:val
  }
  private static slave2FormSetValue( uiSlave:IuiSlave, controlname:string){
    uiSlave.slaveForm.get(controlname)!.setValue((uiSlave.slave as any)[controlname])
    let fc: FormControl = uiSlave.slaveForm.get(["ispecs"]) as FormControl;
    if( uiSlave.specs){
      let slaveSpec = uiSlave.specs.find((s) => s.configuredSlave != undefined);
      if( slaveSpec)
        fc.setValue(slaveSpec)
    }
  }

  private static controllers:string[]=["name","rootTopic","pollInterval", "pollMode","qos", ""]
  saveSlave(uiSlave:IuiSlave){
    SelectSlaveComponent.controllers.forEach(controller=>{
      SelectSlaveComponent.form2SlaveSetValue(uiSlave, controller)  
    })
    //SelectSlaveComponent.form2SlaveSetValue(uiSlave,"discoverEntitiesList")

    let spec:IidentificationSpecification = uiSlave.slaveForm.get("ispecs")!.value
    let selectedEntities:number[] = uiSlave.slaveForm.get("discoverEntitiesList")!.value
    if( spec ){
      uiSlave.slave.specification = this.toSpecification(spec);
      uiSlave.slave.specificationid = spec.filename;
      uiSlave.slave.noDiscoverEntities = []
      if( selectedEntities ){
        spec.entities.forEach(e=>{ 
          if( !selectedEntities.includes(e.id))
            uiSlave.slave.noDiscoverEntities!.push(e.id)
        })
      }
    }
    
    if (this.bus)
      this.entityApiService
            .postSlave(this.bus.busId, uiSlave.slave)
            .subscribe((slave) => {
              this.updateUiSlaves(slave, false);
            });
  }
  cancelSlave(uiSlave:IuiSlave){
    uiSlave.slaveForm.reset()
    SelectSlaveComponent.controllers.forEach(controlname=>{
      uiSlave.slaveForm.get(controlname)!.setValue((uiSlave.slave as any)[controlname])
    })
    if( uiSlave.specs)
    {
      let slaveSpec = uiSlave.specs.find(s=>s.configuredSlave != undefined)
      uiSlave.slaveForm.get("ispecs")!.setValue( slaveSpec)  
    }

    this.slave2Form(uiSlave.slave, uiSlave.slaveForm)
  
  }

  getSpecificationI18nName(
    spec: IbaseSpecification,
    language: string,
  ): string | null {
    return getSpecificationI18nName(spec, language);
  }
  statusTooltip(status: SpecificationStatus | undefined) {
    switch (status) {
      case SpecificationStatus.cloned:
        return "Cloned: This specifications was copied from a published one";
      case SpecificationStatus.added:
        return "Added: This  was created newly";
      case SpecificationStatus.published:
        return "Published: You can copy the published specification to make your changes";
      case SpecificationStatus.contributed:
        return "Contributed: Readonly until the contributions process is finished";
      case SpecificationStatus.new:
        return "New: Create a new specification.";
      default:
        return "unknown";
    }
  }
  statusIcon(status: SpecificationStatus | undefined) {
    switch (status) {
      case SpecificationStatus.cloned:
        return "file_copy";
      case SpecificationStatus.added:
        return "add";
      case SpecificationStatus.published:
        return "public";
      case SpecificationStatus.contributed:
        return "contributed";
      case SpecificationStatus.new:
        return "new_releases";
      default:
        return "unknown";
    }
  }
  addSpecification(slave: Islave) {
    if (this.bus) {
      slave.specification = undefined;
      slave.specificationid = undefined;

      this.editSpecification(slave);
    }
  }
  editSpecification(slave: Islave) {
    if (this.bus) {
      this.entityApiService.postSlave(this.bus.busId, slave).subscribe(() => {
        this.routes.navigate([
          "/specification",
          this.bus!.busId,
          slave.slaveid,
          false,
        ]);
      });
    }
  }
  // editEntitiesList(slave: Islave) {
  //   this.routes.navigate(['/entities', this.bus!.busId, slave.slaveid]);
  // }

  getSlaveName(slave: Islave): string {
    if (slave == null) return "New";
    if (slave.name) return slave.name + "(" + slave.slaveid + ")";
    if (slave.specification)
      return (
        getSpecificationI18nName(slave.specification!, this.currentLanguage!)! +
        "(" +
        slave.slaveid +
        ")"
      );
    return "Slave " + slave.slaveid;
  }
  getSpecEntityName(slave: Islave, entityId: number) {
    let rc: string | null = "--";
    if (slave != null && slave.specification)
      rc = getSpecificationI18nEntityName(
        slave.specification!,
        this.currentLanguage!,
        entityId,
      );
    return rc?rc:"";
  }
  copy2Clipboard(text: string) {
    this.clipboard.copy(text);
  }
  getSelectedEntites(slave:Islave):{id: number, name:string}[]{
    let rc:{id: number, name:string}[] = [];
    if( slave && slave.specification && (slave.specification as ImodbusSpecification).entities)
      (slave.specification as ImodbusSpecification).entities.forEach(e=>{
      let name = getSpecificationI18nEntityName(slave.specification as ImodbusSpecification,this.currentLanguage,e.id)
      rc.push( { id: e.id, name: name?name: "" })
    })
    return rc
  }
  needsSaving(idx: number): boolean {
    let fg = this.uiSlaves[idx].slaveForm;
    return fg == undefined || fg.touched;
  }
  getNoDiscoveryText(uiSlave:IuiSlave){
    if( uiSlave.slaveForm.get("noDiscovery")!.value )
      return "Discovery is disabled for the complete slave."
    else
      return "Discovery is enabled for the complete slave."

  }
  disableDiscoverEntitiesList(uiSlave:IuiSlave, disable:boolean){
    if( uiSlave.slaveForm.get("noDiscovery")!.value)
      uiSlave.slaveForm.get("discoverEntitiesList")!.enable()
    else
    uiSlave.slaveForm.get("discoverEntitiesList")!.disable()

  }
}
