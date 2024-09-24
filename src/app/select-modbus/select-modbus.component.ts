import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { Clipboard } from "@angular/cdk/clipboard";
import {
  MatSelectionList,
  MatSelectionListChange,
} from "@angular/material/list";
import { ApiService } from "../services/api-service";
import { MatTableDataSource } from "@angular/material/table";
import {
  IBus,
  IModbusConnection,
  IRTUConnection,
  ITCPConnection,
  getBusName,
  getConnectionName,
} from "@modbus2mqtt/server.shared";
import { MatSelectChange, MatSelect } from "@angular/material/select";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { MatTabChangeEvent, MatTabGroup, MatTab } from "@angular/material/tabs";
import { BUS_TIMEOUT_DEFAULT } from "@modbus2mqtt/specification.shared";
import { MatOption } from "@angular/material/core";
import { MatInput } from "@angular/material/input";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { MatTooltip } from "@angular/material/tooltip";
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from "@angular/material/card";
import { NgFor, NgIf } from "@angular/common";

@Component({
  selector: "app-select-modbus",
  templateUrl: "./select-modbus.component.html",
  styleUrls: ["./select-modbus.component.css"],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgFor,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatTooltip,
    NgIf,
    MatIconButton,
    MatIcon,
    MatCardContent,
    MatTabGroup,
    MatTab,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
  ],
})
export class SelectModbusComponent implements AfterViewInit, OnDestroy {
  constructor(
    private _formBuilder: FormBuilder,
    private entityApiService: ApiService,
    private route: ActivatedRoute,
    private routes: Router,
    private clipBoard: Clipboard,
  ) {}
  displayedBusIdColumns: string[] = [
    "select",
    "busid",
    "connectionData",
    "deviceCount",
  ];
  busname: string;
  paramSubscription: Subscription;
  serialDevices: string[] = [];
  bussesFormArray: FormArray = this._formBuilder.array([]);
  configureModbusFormGroup = this._formBuilder.group({
    bussesFormArray: this.bussesFormArray,
  });
  modbusIsRtu: boolean[] = [];
  busses: MatTableDataSource<IBus> = new MatTableDataSource<IBus>([]);
  bussesObservable = this.entityApiService.getBusses();
  baudRates: Array<number> = [9600, 11200, 115700];
  selectedBaudRate: number | undefined = undefined;
  @ViewChild("selectBaudRate") selectBaudRate: MatSelectionList;
  @Input() preselectedBusId: number | undefined = undefined;

  uniqueConnectionDataValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    {
      if (this && this.busses && this.busses.data)
        return !this.busses.data.find(
          (bus) =>
            (bus.connectionData as IRTUConnection).serialport == control.value,
        )
          ? null
          : { unique: control.value };
      return null;
    }
  };

  ngAfterViewInit(): void {
    this.entityApiService.getSerialDevices().subscribe((devices) => {
      this.serialDevices = devices;
      this.readBussesFromServer();
    });
    this.paramSubscription = this.route.queryParams.subscribe((params) => {
      console.log(params);
      if (params["busid"] != undefined) {
        this.preselectedBusId = params["busid"];
      }
    });
  }
  ngOnDestroy(): void {
    this.paramSubscription.unsubscribe();
  }

  getConnectionName(bus: IBus): string {
    return getConnectionName(bus.connectionData);
  }
  readBussesFromServer(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.bussesObservable.subscribe((results) => {
        (results as (IBus | null)[]).push(null);
        this.busses.data = results;
        if (this.bussesFormArray != undefined) {
          this.bussesFormArray.clear();
          this.modbusIsRtu = [];
        }
        for (let idx = 0; idx < results.length; idx++) this.copyBus2Form(idx);
        this.modbusIsRtu.push(true);
        this.bussesFormArray.push(this.createConnectionDataFormGroup());
        resolve();
      });
    });
  }
  copyBus2Form(idx: number) {
    if (this.busses.data.length > idx && this.busses.data[idx] != null) {
      let bus = this.busses.data[idx];
      let isRtu =
        (bus.connectionData as IRTUConnection).serialport != undefined;
      let fg = this.createConnectionDataFormGroup();
      if (this.bussesFormArray.at(idx) != undefined)
        fg = this.bussesFormArray.at(idx) as FormGroup;
      else {
        this.bussesFormArray.push(fg);
        this.modbusIsRtu.push(isRtu);
      }
      if (isRtu) {
        let serialport = (bus.connectionData as IRTUConnection).serialport;
        let baudRate = (bus.connectionData as IRTUConnection).baudrate;
        let timeout = (bus.connectionData as IRTUConnection).timeout;
        let sd = this.getSerialFormControl(idx);
        sd.setValue(serialport);

        let br = fg.get(["rtu", "selectBaudRate"]);
        if (br) br.setValue(baudRate);
        let to = fg.get(["rtu", "timeout"]);
        if (to) to.setValue(timeout);
      } else {
        let host = (bus.connectionData as ITCPConnection).host;
        let port = (bus.connectionData as ITCPConnection).port;
        let timeout = (bus.connectionData as IRTUConnection).timeout;
        let sd = fg.get(["tcp", "host"]);
        if (sd) sd.setValue(host);
        let br = fg.get(["tcp", "port"]);
        if (br) br.setValue(port);
        let to = fg.get(["rtu", "timeout"]);
        if (to) to.setValue(timeout);
      }
    }
  }
  getBusFormGroup(index: number): FormGroup {
    let fg = (
      this.configureModbusFormGroup.get("bussesFormArray") as FormArray
    ).at(index) as FormGroup;
    if (fg == undefined) return this.createConnectionDataFormGroup();
    return fg;
  }
  cancelBus(idx: number): void {
    this.bussesFormArray.at(idx).markAsUntouched();
    this.copyBus2Form(idx);
  }
  needsSaving(idx: number): boolean {
    let fg = this.bussesFormArray.at(idx);
    return fg == undefined || fg.touched;
  }
  saveBus(idx: number): Promise<number> {
    return new Promise<number>((resolve) => {
      let connection = this.copyForm2Connection(idx);
      let busid: number | undefined =
        null != this.busses.data[idx] ? this.busses.data[idx].busId : undefined;

      this.entityApiService.postBus(connection, busid).subscribe((b) => {
        if (busid == undefined) {
          // New bus was added
          this.readBussesFromServer();
        } else {
          resolve(b.busid);
          this.bussesFormArray.at(idx).markAsUntouched();
        }
      });
    });
  }
  copyForm2Connection(idx: number): IModbusConnection {
    let timeout: FormControl | null = null;
    let baudrate: FormControl | null = null;
    let host: FormControl | null = null;
    let port: FormControl | null = null;
    let fg: FormGroup = this.bussesFormArray.at(idx)! as FormGroup;
    let connectionData: IModbusConnection = this.busses.data[idx]
      ? this.busses.data[idx].connectionData
      : ({} as IModbusConnection);
    if (fg) {
      if (
        this.modbusIsRtu[idx] &&
        undefined != (timeout = fg.get(["rtu", "timeout"]) as FormControl) &&
        undefined !=
          (baudrate = fg.get(["rtu", "selectBaudRate"]) as FormControl)
      ) {
        if ((connectionData as IRTUConnection).baudrate != baudrate.value) {
          (connectionData as IRTUConnection).baudrate = baudrate.value;
        }
        (connectionData as IRTUConnection).serialport =
          this.getSerialFromForm(idx);
        if ((connectionData as IRTUConnection).timeout != timeout.value) {
          (connectionData as IRTUConnection).timeout = timeout.value;
        }
        delete (connectionData as any).host;
        delete (connectionData as any).port;
      } else {
        if (
          undefined != (host = fg.get(["tcp", "host"]) as FormControl) &&
          undefined != (timeout = fg.get(["tcp", "timeout"]) as FormControl) &&
          undefined != (port = fg.get(["tcp", "port"]) as FormControl)
        ) {
          if ((connectionData as ITCPConnection).host != host.value) {
            (connectionData as ITCPConnection).host = host.value;
          }
          if ((connectionData as ITCPConnection).port != port.value) {
            (connectionData as ITCPConnection).port = port.value;
          }
          if ((connectionData as ITCPConnection).timeout != timeout.value) {
            (connectionData as ITCPConnection).timeout = timeout.value;
          }
          delete (connectionData as any).serialport;
          delete (connectionData as any).baudrate;
        }
      }
    }
    return connectionData;
  }

  stringCompare(o1: any, o2: any): boolean {
    return (o1 as string) === (o2 as string);
  }
  getSerialDevices(_bus: IBus | null): string[] {
    // Remove serialport names, which are already configured
    let devices = structuredClone(this.serialDevices);
    let didx;
    for (didx = 0; didx < devices.length; ) {
      let sd = devices[didx];
      let idx = this.busses.data.findIndex(
        (b) =>
          b != null &&
          (b.connectionData as IRTUConnection).serialport &&
          (b.connectionData as IRTUConnection).serialport == sd &&
          (_bus == null ||
            sd != (_bus.connectionData as IRTUConnection).serialport),
      );
      if (idx != -1) devices.splice(didx, 1);
      else didx++;
    }
    return devices;
  }

  isRTU(idx: number): boolean {
    return this.modbusIsRtu[idx];
  }
  checkConfigRTU(): boolean {
    return false; //this.config !== undefined && this.config.connectionData[0].baudrate == undefined
  }
  private serialValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    return this.serialDevices.length == 0 &&
      (!control.value || control.value.length == 0)
      ? { "not empty": control.value }
      : null;
  };
  private serialDevicesValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    return this.serialDevices.length > 0 &&
      (!control.value || control.value.length == 0)
      ? { "not empty": control.value }
      : null;
  };
  createConnectionDataFormGroup(): FormGroup {
    let fg = this._formBuilder.group({
      selectedBusTab: this._formBuilder.control(0),
      rtu: this._formBuilder.group({
        serial: [null, this.serialValidator],
        serialDeviceSelection: [null, this.serialDevicesValidator],
        selectBaudRate: [9600, Validators.required],
        timeout: [BUS_TIMEOUT_DEFAULT, Validators.required],
      }),
      tcp: this._formBuilder.group({
        host: ["", Validators.required],
        port: [502, Validators.required],
        timeout: [100, Validators.required],
      }),
    });
    return fg;
  }
  hasRtuError(error: string): boolean {
    return this.configureModbusFormGroup.get("rtu")!.hasError(error);
  }
  addEnabled(idx: number) {
    let fg = this.bussesFormArray.at(idx);
    if (fg)
      if (this.isRTU(idx))
        return this.bussesFormArray.at(idx)!.get("rtu")!.valid;
      else return this.bussesFormArray.at(idx)!.get("tcp")!.valid;
    return false;
  }
  copy2Serial(idx: number, event: MatSelectChange) {
    let fg = this.getBusFormGroup(idx);
    fg.get("serial")!.setValue(event.value);
  }
  copy2SerialDevices(idx: number) {
    let fg = this.getBusFormGroup(idx);
    fg.get("serialDeviceSelection")?.setValue(fg.get("serial")?.value);
  }
  getBusName(bus: IBus): string {
    if (bus == null) return "New";
    return getBusName(bus);
  }
  deleteBus(bus: IBus) {
    if (
      bus.slaves.length == 0 ||
      confirm(
        "There is/are " +
          bus.slaves.length +
          " slaves configured. Are you sure to delete it/them?",
      )
    ) {
      this.entityApiService.deleteBus(bus.busId).subscribe(() => {
        this.readBussesFromServer();
      });
    }
  }

  canDeleteRow(bus: IBus): boolean {
    return bus.slaves.length > 0;
  }

  selectedTypeChanged($event: MatTabChangeEvent, index: number) {
    this.modbusIsRtu[index] = $event.index == 0;
  }

  getSerialFromForm(idx: number): string {
    let s = this.getSerialFormControl(idx);
    return s && s.value && s.value.length ? s.value : "New";
  }

  getSerialFormControl(idx: number): FormControl<string> {
    let busFormGroup = this.getBusFormGroup(idx);
    let s: FormControl<string>;
    if (this.serialDevices.length == 0)
      s = busFormGroup.get(["rtu", "serial"])! as FormControl<string>;
    else
      s = busFormGroup.get([
        "rtu",
        "serialDeviceSelection",
      ])! as FormControl<string>;
    return s;
  }

  isSelectedBaudRate(br: number): boolean {
    return this.selectedBaudRate !== undefined && br == this.selectedBaudRate;
  }

  onSelectBaudRateChange(newValue: MatSelectChange | undefined | null) {
    if (newValue) {
      console.log("nothing to do?");
    }
  }
  listSlaves(idx: number) {
    this.saveBus(idx).then((busid) => {
      this.readBussesFromServer().then(() => {
        this.routes.navigate(["/slaves", busid]);
      });
    });
  }
}
