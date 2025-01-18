import { NgFor, NgIf } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatIconButton } from "@angular/material/button";
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from "@angular/material/card";
import { MatOption } from "@angular/material/core";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatIcon, MatIconModule } from "@angular/material/icon";
import { MatInput } from "@angular/material/input";
import { MatSelect } from "@angular/material/select";
import { MatTabGroup, MatTab } from "@angular/material/tabs";
import { MatTooltip } from "@angular/material/tooltip";
import {
  Iconfiguration,
  ImodbusErrorsForSlave,
} from "@modbus2mqtt/server.shared";
import { ApiService } from "../services/api-service";

@Component({
  selector: "app-modbus-error-component",
  imports: [MatIconModule, NgIf, NgFor],
  standalone: true,
  templateUrl: "./modbus-error.component.html",
  styleUrl: "./modbus-error.component.css",
})
export class ModbusErrorComponent implements OnInit {
  config: Iconfiguration;
  @Input({ required: true }) modbusErrors: ImodbusErrorsForSlave | undefined;

  constructor(private entityApiService: ApiService) {}

  ngOnInit(): void {}
  getUniqueErrors(): string[] {
    if (this.modbusErrors == undefined) return [];
    return [...new Set<string>(this.modbusErrors.errors.map((f) => f.message))];
  }
}
