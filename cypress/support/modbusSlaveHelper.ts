import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { EventEmitter } from "@angular/core";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { apiUri } from "@modbus2mqtt/server.shared";
import { SelectSlaveComponent } from "angular/src/app/select-slave/select-slave.component";
import { from } from "rxjs";
let ev = new EventEmitter<number | undefined>()
// entityApiService.getConfiguration {mqttbasetopic rootUrl apiUri.configuration
// entityApiService.getBus  bus.connectionData, bus.busId apiUri.bus
// entityApiService.getSlaves Islave[] apiUri.slaves
// getSpecsForSlave IidentificationSpecification[] apiUri.specsForSlaveId
// not implemented yet deleteSlave
// not implemented yet postSlave

/**
 * mounts the specification-entity-component and opens all expansion panels
 *
 * The entity values must be changed in the UI using cypress methods
 *
 * The Modbus Value is a 32 bit array. It can be changed in specificationMethods.postModbusEntity if required
 *
 * If other initial values are required, a new test file is required
 */
export function beforeEachHelper() {
  cy.intercept("GET", "**/converters", {
    fixture: "converters.json",
  });
  // This configures the rootUrl for /api... calls
  // they need to be relative in ingress scenarios,
  // but they must be absolute for cypress tests
  cy.window().then((win) => {
    (win as any).configuration = { rootUrl: "/" };
  });
  cy.mount(SelectSlaveComponent, {
    imports: [NoopAnimationsModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideRouter([]),{
        provide: ActivatedRoute,
        useValue: {
          params: from([{busid: 1}]),
        },
      },],
    componentProperties: {
        slaveidEventEmitter:ev
    },
  });
}

