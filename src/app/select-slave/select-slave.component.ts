import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { ApiService } from '../services/api-service';
import { getCurrentLanguage, IbaseSpecification, getSpecificationI18nName, SpecificationStatus, IdentifiedStates } from '@modbus2mqtt/specification.shared';
import { Observable, Subscription, map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionStorage } from '../services/SessionStorage';
import { M2mErrorStateMatcher } from '../services/M2mErrorStateMatcher';
import { Islave, IidentificationSpecification, IBus, getConnectionName } from '@modbus2mqtt/server.shared';

const ISELECTED_FORMNAME = 'isSelected'
const ISLAVENAME_FORMNAME = 'name'
const ISLAVENAME_FORMPOLLINTERVAL = 'pollinterval'
const SLAVE_TABLE_FORMNAME = 'tableRows'
const HIDDENSLAVEID = 'hiddenSlaveId'
interface IuiSlave {
  slave: Islave;
  label: string;
  specs: Observable<IidentificationSpecification[]>;
  slaveForm: FormGroup;
}
@Component({
  selector: 'app-select-slave',
  templateUrl: './select-slave.component.html',
  styleUrls: ['./select-slave.component.css']
})
export class SelectSlaveComponent extends SessionStorage implements OnInit {

  getDetectSpecToolTip(): string {
    return this.slaveNewForm.get("detectSpec")?.value == true ? "If there is exactly one specification matching to the modbus data for this slave, " +
      "the specification will be selected automatically" : "Please set the specification for the new slave after adding it"
  }
  keyDown(event: Event, fg: FormGroup) {
    if ((event.target as HTMLInputElement).name == 'newSlaveId')
      this.addSlave(fg)
    event.preventDefault()
  }



  getSpecIcon(arg0: any) {
    throw new Error('Method not implemented.');
  }
  currentLanguage: string;
  busname: string
  constructor(private _formBuilder: FormBuilder, private route: ActivatedRoute, private entityApiService: ApiService, private routes: Router) {
    super()
  }
  showAllPublicSpecs = new FormControl<boolean>(false)
  uiSlaves: IuiSlave[] = [];
  slaves: (Islave)[] = [];
  // label:string;
  // slaveForms: FormGroup[]
  // specs:Observable<IidentificationSpecification[]> []=[]
  //slavesFormArray: FormArray<FormGroup>
  slaveNewForm: FormGroup = this._formBuilder.group({
    slaveId: [null],
    detectSpec: [true]
  });
  paramsSubscription: Subscription;
  errorStateMatcher = new M2mErrorStateMatcher()

  preselectedBusId: number;
  bus: IBus;
  preselectedSlaveId: number | undefined = undefined;
  @ViewChild('slavesBody') slavesBody: ElementRef;
  @Output() slaveidEventEmitter = new EventEmitter<number | undefined>();
  ngOnInit(): void {
    this.currentLanguage = getCurrentLanguage(navigator.language);
    this.paramsSubscription = this.route.params.subscribe(params => {
      let busId = +params['busid']
      this.entityApiService.getBus(busId).subscribe(bus => {
        this.bus = bus;
        if (this.bus) {
          this.busname = getConnectionName(this.bus.connectionData)
          this.updateSlaves(bus)

        }
      })
    })
  }
  private fillSpecs(detectSpec: boolean | undefined, fg: FormGroup, slave: Islave, spec: IidentificationSpecification[]): IidentificationSpecification[] {

    let fc: FormControl = fg.get(['ispecs']) as FormControl
    let slaveSpec = spec.find(s => s.configuredSlave != undefined)
    let identifiedCount = 0
    let ispec: IidentificationSpecification | null = null
    if (detectSpec) {
      if (!slaveSpec) {
        spec.forEach(s => {
          if (s.identified == IdentifiedStates.identified) {
            identifiedCount++
            ispec = s
          }

        })
        if (identifiedCount == 1 && ispec != null) {
          slave.specificationid = (ispec as IidentificationSpecification).filename
          this.onSelectionChange(slave)
          fc.setValue(ispec)
        }
      }
    }
    fc.setValue(slaveSpec)


    return spec
  }
  private updateSlaves(bus: IBus, detectSpec?: boolean) {

    this.entityApiService.getSlaves(this.bus.busId).subscribe((slaves) => {
      this.uiSlaves = []
      slaves.forEach(s => {
        this.uiSlaves.push(this.getUiSlave(s, detectSpec))
      })
      this.generateSlavesArray()
    })
  }
  private generateSlavesArray(): void {
    this.slaves = []
    this.uiSlaves.forEach(uis => { this.slaves.push(uis.slave) })
  }
  getUiSlave(slave: Islave, detectSpec: boolean | undefined): IuiSlave {
    let fg = this.initiateSlaveControl(slave.slaveid, null, slave.name)
    return {
      slave: slave,
      specs: this.entityApiService.getSpecsForSlave(this.bus!.busId!, slave.slaveid, this.showAllPublicSpecs.value!).pipe(
        map(this.fillSpecs.bind(this, detectSpec, fg, slave))),
      label: this.getSlaveName(slave),
      slaveForm: fg
    }
  }
  updateUiSlaves(slave: Islave, detectSpec: boolean | undefined): void {
    let idx = this.uiSlaves.findIndex(s => s.slave.slaveid == slave.slaveid)
    if (idx >= 0)
      this.uiSlaves[idx] = this.getUiSlave(slave, detectSpec)
    else
      this.uiSlaves.push(this.getUiSlave(slave, detectSpec))
  }
  updateUiSlaveData(slave: Islave): void {
    let idx = this.uiSlaves.findIndex(s => s.slave.slaveid == slave.slaveid)

    if (idx >= 0) {
      this.uiSlaves[idx].slave = slave
      this.uiSlaves[idx].label = this.getSlaveName(slave)
    }
  }
  ngOnDestroy(): void {
    this.paramsSubscription.unsubscribe();
  }


  onSelectionChange(slave: Islave) {

    this.entityApiService.postSlave(this.bus!.busId, slave).subscribe((slave) => {
      this.updateUiSlaves(slave, false)
    })
  }
  showUnmatched(event: any) {
    this.showAllPublicSpecs.value
    this.updateSlaves(this.bus, false)
  }
  compareSpecificationIdentification(o1: IidentificationSpecification, o2: IidentificationSpecification) {
    return o1 && o2 && o1.filename == o2.filename;
  }
  identifiedTooltip(identified: IdentifiedStates | null | undefined): string {
    if (!identified || identified == -1)
      return 'no identification possible'
    if (identified == 1)
      return 'known device'
    return 'unknown device'
  }
  identifiedIcon(identified: IdentifiedStates | null | undefined): string {
    if (!identified || identified == -1)
      return 'thumbs_up_down'
    if (identified == 1)
      return 'thumb_up'
    return 'thumb_down'
  }
  toBaseSpecification(spec: IidentificationSpecification | null | undefined): IbaseSpecification | undefined {
    if (spec)
      return {
        filename: spec.filename,
        status: spec.status,
        i18n: spec.i18n,
        files: spec.files
      }
    return undefined
  }
  onSpecificationChange(slave: Islave | null, event: IidentificationSpecification) {
    if (slave != null) {
      if (event == null) {
        delete slave.specification
        delete slave.specificationid
      }
      else {
        slave.specification = this.toBaseSpecification(event)
        slave.specificationid = event.filename
      }

      if (this.bus)
        this.entityApiService.postSlave(this.bus.busId, slave).subscribe((slave => {
          this.updateUiSlaves(slave, false)
        }));
    }
  }

  initiateSlaveControl(slaveId: number, defaultValue: IidentificationSpecification | null, slaveName?: string, polinterval?: number): FormGroup {
    if (slaveId >= 0)
      return this._formBuilder.group({
        hiddenSlaveId: [slaveId],
        ispecs: [defaultValue],
        name: [(slaveName ? slaveName : null) as string | null, this.uniqueNameValidator.bind(this, slaveId)],
        pollInterval: [polinterval ? polinterval : 1000]
      });
    else
      return this._formBuilder.group({
        slaveId: [null],
        ispecs: [defaultValue],
      });
  }

  hasDuplicateName(slaveId: number, name: string): boolean {
    let rc: boolean = false
    if (!name) {
      let theSlave = this.uiSlaves.find(s => s != null && s.slave.slaveid == slaveId)
      if (theSlave && theSlave.slave.specificationid)
        name = theSlave.slave.specificationid
    }

    this.uiSlaves.forEach(uislave => {
      if (uislave != null && uislave.slave.slaveid != slaveId) {
        let searchName: string | undefined = (uislave.slave.name ? uislave.slave.name : uislave.slave.specificationid);
        if (searchName == name)
          rc = true
      }
    })
    return rc;
  }

  uniqueNameValidator: any = (slaveId: number, control: AbstractControl): ValidationErrors | null => {
    if (this.hasDuplicateName(slaveId, control.value))
      return { "duplicates": control.value }
    else
      return null;
  }

  deleteSlave(slave: Islave | null) {
    if (slave != null && this.bus)
      this.entityApiService.deleteSlave(this.bus.busId, slave.slaveid).subscribe(() => {
        console.log("Device deleted");
        let dIdx = this.uiSlaves.findIndex(uis => uis.slave.slaveid == slave.slaveid)
        if (dIdx >= 0) {
          this.uiSlaves.splice(dIdx, 1)
          this.updateSlaves(this.bus, false)
        }
      })
  }

  getSlaveIdFromForm(newSlaveFormGroup: FormGroup): number {
    let slaveId: string = ""
    if (newSlaveFormGroup)
      slaveId = newSlaveFormGroup.get("slaveId")!.value
    return (slaveId != undefined && parseInt(slaveId) >= 0 ? parseInt(slaveId) : -1)

  }

  canAddSlaveId(newSlaveFormGroup: FormGroup): boolean {
    let slaveId: number = this.getSlaveIdFromForm(newSlaveFormGroup)
    return (slaveId >= 0 && (null == this.uiSlaves.find(uis => uis != null && uis.slave.slaveid != null && uis.slave.slaveid == slaveId)))
  }
  addSlave(newSlaveFormGroup: FormGroup): void {

    let slaveId: number = this.getSlaveIdFromForm(newSlaveFormGroup)
    let detectSpec = newSlaveFormGroup.get(['detectSpec'])?.value
    if (this.canAddSlaveId(newSlaveFormGroup))
      this.entityApiService.postSlave(this.bus.busId, { slaveid: slaveId }).subscribe((slave) => {
        this.updateSlaves(this.bus, detectSpec)
      })
  }


  setSlaveName(event: Event, slave: Islave) {
    slave.name = (event.target as HTMLInputElement).value;
    this.entityApiService.postSlave(this.bus!.busId, slave).subscribe(() => {
      this.updateUiSlaveData(slave)
    })
  }
  setPolInterval(event: Event, slave: Islave) {
    slave.polInterval = parseInt((event.target as HTMLInputElement).value);
    this.entityApiService.postSlave(this.bus!.busId, slave).subscribe(() => {
      this.updateUiSlaveData(slave)
    })
  }

  getSpecificationI18nName(spec: IbaseSpecification, language: string): string | null { return getSpecificationI18nName(spec, language) }
  statusTooltip(status: SpecificationStatus | undefined) {
    switch (status) {
      case SpecificationStatus.cloned: return "Cloned: This specifications was copied from a published one";
      case SpecificationStatus.added: return "Added: This  was created newly";
      case SpecificationStatus.published: return "Published: You can copy the published specification to make your changes";
      case SpecificationStatus.contributed: return "Contributed: Readonly until the contributions process is finished";
      case SpecificationStatus.new: return "New: Create a new specification."
      default: return "unknown";
    }
  }
  statusIcon(status: SpecificationStatus | undefined) {
    switch (status) {
      case SpecificationStatus.cloned: return "file_copy";
      case SpecificationStatus.added: return "add";
      case SpecificationStatus.published: return "public";
      case SpecificationStatus.contributed: return "contributed";
      case SpecificationStatus.new: return "new_releases";
      default: return "unknown";
    }
  }
  addSpecification(slave: Islave) {
    if (this.bus) {
      slave.specification = undefined
      slave.specificationid = undefined
      this.editSpecification(slave)
    }
  }
  editSpecification(slave: Islave) {
    if (this.bus) {
      this.entityApiService.postSlave(this.bus.busId, slave).subscribe(() => {
        this.routes.navigate(['/specification', this.bus!.busId, slave.slaveid, false]);
      }
      );
    }
  }
  // editEntitiesList(slave: Islave) {
  //   this.routes.navigate(['/entities', this.bus!.busId, slave.slaveid]);
  // }


  getSlaveName(slave: Islave): string {
    if (slave == null)
      return "New"
    if (slave.name)
      return slave.name + "(" + slave.slaveid + ")"
    if (slave.specification)
      return getSpecificationI18nName(slave.specification!, this.currentLanguage!)! + "(" + slave.slaveid + ")"
    return "Slave " + slave.slaveid
  }

}

