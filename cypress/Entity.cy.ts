import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http"
import { NoopAnimationsModule } from "@angular/platform-browser/animations"
import { ActivatedRoute, provideRouter } from "@angular/router"
import { IdentifiedStates, ImodbusData, ImodbusEntity, Iselect } from "@modbus2mqtt/specification.shared"
import { ISpecificationMethods } from "angular/src/app/services/specificationInterface"
import { EntityComponent } from "angular/src/app/specification/entity/entity.component"
import { Subject } from "rxjs"

let specificationMethods:ISpecificationMethods = {
  getCurrentMessage:()=>{return {type:0, category: 0}},
  getMqttLanguageName:()=>{return "english"},
  getNonVariableNumberEntities:()=>{ return []},
  getMqttNames: ()=> {return []},     
  getSaveObservable:()=> {return new Subject<void>()},
  postModbusEntity:()=>{return new Subject<ImodbusData>()}, 
  postModbusWriteMqtt: ()=> {return new Subject<string>()},
  hasDuplicateVariableConfigurations:  ()=>{ return false},
  canEditEntity: ()=>{return true},
  setEntitiesTouched:()=>{},
  addEntity:()=>{}, 
  deleteEntity:()=>{}, 
  copy2Translation:()=>{}
};

let selectEntity:ImodbusEntity = {
  id: 1, 
  modbusValue: [3], 
  mqttValue:"3", 
  identified:IdentifiedStates.identified,
  converter: {name:"select", registerTypes:[3,4] }, 
  readonly:false, 
  registerType: 3, 
  modbusAddress: 4,
  converterParameters: {

  } as Iselect
 }


describe('Entity Component tests', () => {
	beforeEach(() => {
		cy.intercept("GET", "**/converters",{
      fixture: "converters.json"
    })
    // This configures the rootUrl for /api... calls
    // they need to be relative in ingress scenarios,
    // but they must be absolute for cypress tests
    cy.window().then(win => {
      (win as any).configuration = { rootUrl: "/" }
    })
	});
  it('can mount', () => {

     cy.mount(EntityComponent,{
      imports:[NoopAnimationsModule],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideRouter([])],
        componentProperties: {
          specificationMethods: specificationMethods,
          entity: selectEntity,
          disabled:false
        }
     })
  })
})