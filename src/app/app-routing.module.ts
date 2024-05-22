import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { SpecificationComponent } from './specification/specification.component';
import { LoginComponent } from './login/login.component';
import { AuthGuardService } from './services/auth-guard.service';
import { ConfigureComponent } from './configure/configure.component';
import { SelectModbusComponent } from './select-modbus/select-modbus.component';
import { SelectSlaveComponent } from './select-slave/select-slave.component';
import { RootRoutingComponent } from './root-routing/root-routing.component';
import { SpecificationsComponent } from './specifications/specifications.component';

export const routes: Routes = [
  { path: '', component: RootRoutingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent },
  { path: 'configure', component: ConfigureComponent, canActivate: [AuthGuardService] },
  { path: 'busses', component: SelectModbusComponent, canActivate: [AuthGuardService] },
  { path: 'specifications', component: SpecificationsComponent, canActivate: [AuthGuardService] },
  { path: 'slaves/:busid', component: SelectSlaveComponent, canActivate: [AuthGuardService] },
  { path: 'specification/:busid/:slaveid/:disabled', canActivate: [AuthGuardService], component: SpecificationComponent, canDeactivate: [(component: SpecificationComponent) => !component.canDeactivate()], },
];
// bootstrapApplication(AppComponent,{
//   providers:[provideRouter(routes, withComponentInputBinding())]
// })

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, {
      bindToComponentInputs: true

    })
  ],
  providers: [AuthGuardService,],

  exports: [RouterModule]
})
export class AppRoutingModule { }
