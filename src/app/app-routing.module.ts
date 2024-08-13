import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Routes, RouterModule } from "@angular/router";
import { SpecificationComponent } from "./specification/specification.component";
import { LoginComponent } from "./login/login.component";
import { AuthGuardService } from "./services/auth-guard.service";
import { ConfigureComponent } from "./configure/configure.component";
import { SelectModbusComponent } from "./select-modbus/select-modbus.component";
import { SelectSlaveComponent } from "./select-slave/select-slave.component";
import { RootRoutingComponent } from "./root-routing/root-routing.component";
import { SpecificationsComponent } from "./specifications/specifications.component";
import { RoutingNames } from "@modbus2mqtt/server.shared";
export const routes: Routes = [
  { path: "", component: RootRoutingComponent, pathMatch: "full" },
  { path: RoutingNames.login, component: LoginComponent },
  { path: RoutingNames.register, component: LoginComponent },
  {
    path: RoutingNames.configure,
    component: ConfigureComponent,
    canActivate: [AuthGuardService],
  },
  {
    path: RoutingNames.busses,
    component: SelectModbusComponent,
    canActivate: [AuthGuardService],
  },
  {
    path: RoutingNames.specifications,
    component: SpecificationsComponent,
    canActivate: [AuthGuardService],
  },
  {
    path: RoutingNames.slaves + "/:busid",
    component: SelectSlaveComponent,
    canActivate: [AuthGuardService],
  },
  {
    path: RoutingNames.specification + "/:busid/:slaveid/:disabled",
    canActivate: [AuthGuardService],
    component: SpecificationComponent,
    canDeactivate: [(component: SpecificationComponent) => !component.canDeactivate()],
  },
];
// bootstrapApplication(AppComponent,{
//   providers:[provideRouter(routes, withComponentInputBinding())]
// })

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, {
      bindToComponentInputs: true,
      useHash: true,
    }),
  ],
  providers: [AuthGuardService],

  exports: [RouterModule],
})
export class AppRoutingModule {}
