import { ImodbusEntityWithName } from "angular/src/app/services/specificationInterface";
import { beforeEachHelper } from "./support/modbusSlaveHelper";

describe("Select Slave tests", () => {
  beforeEach(beforeEachHelper); // mounts entity and opens all expansion panels
  //afterEach(afterEachEntityHelper);
  it("mount", () => {
    cy.get('mat-select[formControlName="variableType"]')
      });
  });
