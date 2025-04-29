import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ActivatedRoute, provideRouter } from "@angular/router";

import { ISpecificationMethods } from "angular/src/app/services/specificationInterface";
import { ModbusErrorComponent } from "angular/src/app/modbus-error/modbus-error.component";
import {
  Iconfiguration,
  ImodbusErrorsForSlave,
  ModbusErrorStates,
  ModbusTasks,
} from "@modbus2mqtt/server.shared";
import { ModbusRegisterType } from "@modbus2mqtt/specification.shared";

let modbusErrors: ImodbusErrorsForSlave = {
  task: ModbusTasks.deviceDetection,
  date: Date.now(),
  address: { address:1,registerType:ModbusRegisterType.HoldingRegister},
  state:ModbusErrorStates.crc

};

describe("Modbus Error Component tests", () => {
  beforeEach(() => {
    // This configures the rootUrl for /api... calls
    // they need to be relative in ingress scenarios,
    // but they must be absolute for cypress tests
    cy.window().then((win) => {
      (win as any).configuration = { rootUrl: "/" };
    });
    cy.mount(ModbusErrorComponent, {
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideRouter([]),
      ],
      autoDetectChanges: true,
      componentProperties: {
        modbusErrors: [modbusErrors],
      },
    });
  });
  it("can mountx", () => {});
  
  xit("first icon is red", () => {
    cy.get("div.icon-text mat-icon").should("satisfy", ($el) => {
      const classList = Array.from($el[0].classList);
      return classList.includes("red"); // passes
    });
  });
  xit("third icon is green", () => {
    cy.get("div.icon-text mat-icon").should("satisfy", ($el) => {
      const classList = Array.from($el[2].classList);
      return classList.includes("green"); // passes
    });
  });
});
