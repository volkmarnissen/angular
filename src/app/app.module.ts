import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { MatDialogModule } from "@angular/material/dialog";

import { AppComponent } from "./app.component";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AppRoutingModule } from "./app-routing.module";
import { RouterModule } from "@angular/router";
import { SpecificationComponent } from "./specification/specification.component";
import { SpecificationsComponent } from "./specifications/specifications.component";
import { DragndropDirective } from "./dragndrop/dragndrop.directive";
import { SelectModbusComponent } from "./select-modbus/select-modbus.component";
import { TranslateModule } from "@ngx-translate/core";
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { ConfigureComponent } from "./configure/configure.component";
import { SelectSlaveComponent } from "./select-slave/select-slave.component";
import { HeaderComponent } from "./header/header.component";
import { TranslationComponent } from "./translation/translation.component";
import { LoginComponent } from "./login/login.component";
import { AuthHeaderInterceptor } from "../interceptors/auth-header.interceptor";
import { EntityValueControlComponent } from "./entity-value-control/entity-value-control.component";
import { RootRoutingComponent } from "./root-routing/root-routing.component";
import { GalleryModule } from "ng-gallery";
import { UploadFilesComponent } from "./upload-files/upload-files.component";
import { EntityComponent } from "./entity/entity.component";
import { DragDropModule } from "@angular/cdk/drag-drop";

@NgModule({
    declarations: [AppComponent],
    bootstrap: [AppComponent],
    imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatDialogModule,
    GalleryModule,
    RouterModule.forRoot([]),
    TranslateModule.forRoot(),
    DragDropModule,
    SpecificationComponent,
    SpecificationsComponent,
    DragndropDirective,
    SelectModbusComponent,
    ConfigureComponent,
    SelectSlaveComponent,
    HeaderComponent,
    RootRoutingComponent,
    TranslationComponent,
    LoginComponent,
    EntityValueControlComponent,
    EntityComponent,
    UploadFilesComponent,
],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthHeaderInterceptor,
            multi: true,
        },
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModules {}
