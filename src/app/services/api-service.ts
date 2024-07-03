import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, Subject } from "rxjs";
import { catchError, first, map } from "rxjs/operators";

//we've defined our base url here in the env
import { ImodbusSpecification, Iconverter, ImodbusEntity, IimageAndDocumentUrl, HttpErrorsEnum, Ispecification, SpecificationFileUsage, editableConverters, Imessage } from '@modbus2mqtt/specification.shared';
import { SessionStorage } from './SessionStorage';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from './i18n.service';
import { ImodbusEntityWithName } from './specificationInterface';
import { apiUri, Iconfiguration, IUserAuthenticationStatus, IBus, Islave, IidentificationSpecification, IModbusConnection } from '@modbus2mqtt/server.shared';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  converterCache: Iconverter[] | undefined = undefined
  constructor(private httpClient: HttpClient, private router: Router, private activeatedRoute: ActivatedRoute) {
    this.errorHandler = (err: HttpErrorResponse) => {
      if ([HttpErrorsEnum.ErrUnauthorized, HttpErrorsEnum.ErrForbidden].includes(err.status)) {
        new SessionStorage().removeAuthToken()
        this.router.navigate(['login'], { queryParams: { toUrl: router.url } })
      }
      else {
        let msg = ""
        if (err.error)
          if (err.error.error)
            msg += err.error.error + "\n";
          else
            msg += err.error + "\n";
        msg += err.statusText
        if (!err.error && !err.error.error && !err.statusText && err.message)
          msg = err.message
        alert(msg);
        console.log(JSON.stringify(err));
      }

    }
  }
  loadingError$ = new Subject<boolean>();

  errorHandler: (err: HttpErrorResponse) => any;
  getSpecification(specification: string | undefined = undefined): Observable<Ispecification> {
    if (!specification)
      throw new Error("spec is a required parameter")

    let f: string = `/api/specification?&spec=${specification}`;
    console.log(f);
    return this.httpClient.get<Ispecification>(f); // No error Handling!!!
  }

  getModbusSpecification(busid: number, slaveid: number, specification: string | undefined = undefined): Observable<ImodbusSpecification> {

    let f: string = apiUri.modbusSpecification + `?busid=${busid}&slaveid=${slaveid}`;
    if (specification)
      f = f + `&spec=${specification}`
    console.log(f);
    return this.httpClient.get<ImodbusSpecification>(f).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<ImodbusSpecification>();
      }));
  }
  getConverters(): Observable<Iconverter[]> {
    if (this.converterCache != undefined) {
      let sub = new Subject<Iconverter[]>
      sub.pipe(first())
      setTimeout(() => {
        sub.next(this.converterCache!)
      }, 1);
      return sub
    }

    let url = `/api/converters`
    return this.httpClient.get<Iconverter[]>(url).pipe(
      map((cnv) => {
        this.converterCache = cnv as Iconverter[]
        return cnv
      }),
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Iconverter[]>();
      }));
  }
  postValidateMqtt(config: Iconfiguration): Observable<{ valid: boolean, message: string }> {
    let url = `/api/validate/mqtt`
    return this.httpClient.post<{ valid: boolean, message: string }>(url, config).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<{ valid: boolean, message: string }>();
      }));
  }
  getSslFiles(): Observable<string[]> {
    let url = `/api/sslfiles`
    return this.httpClient.get<string[]>(url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<string[]>();
      }));
  }
  getSerialDevices(): Observable<string[]> {
    let url = `/api/serial/devices`
    return this.httpClient.get<string[]>(url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<string[]>();
      }));
  }
  getUserAuthenticationStatus(): Observable<IUserAuthenticationStatus> {
    let url = `/userAuthenticationStatus`
    return this.httpClient.get<IUserAuthenticationStatus>(url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IUserAuthenticationStatus>();
      })
    );
  }
  getBusses(): Observable<IBus[]> {
    let url = `/api/busses`
    return this.httpClient.get<IBus[]>(url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IBus[]>();
      }));
  }
  getBus(busid: number): Observable<IBus> {
    let url = apiUri.bus + `?busid=${busid}`
    return this.httpClient.get<IBus>(url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IBus>();
      }));
  }
  getSlave(busid: number, slaveid: number): Observable<Islave> {
    return this.httpClient.get<Islave>(apiUri.slave + `?busid=${busid}&slaveid=${slaveid}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Islave>();
      }));
  }
  getSlaves(busid: number): Observable<Islave[]> {
    return this.httpClient.get<Islave[]>(apiUri.slaves + `?busid=${busid}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Islave[]>();
      }));
  }
  getUserLogin(username: string, password: string): Observable<string> {
    return this.httpClient.get<any>(apiUri.userLogin + `?name=${username}&password=${password}`).pipe(
      map(value => { return value.token }),
      catchError(err => {
        this.errorHandler(err);
        return new Observable<string>();
      }));
  }
  getUserRegister(username: string, password: string): Observable<void> {
    return this.httpClient.get<void>(apiUri.userRegister + `?name=${username}&password=${password}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<void>();
      }));
  }

  getSpecsForSlave(busid: number, specificSlaveId: number, showAllPublicSpecs: boolean): Observable<IidentificationSpecification[]> {
    let p1 = (specificSlaveId ? "&slaveid=" + specificSlaveId : "")
    let param = "?busid=" + busid + p1;
    if (showAllPublicSpecs)
      param = param + "&showAllPublicSpecs=true"
    return this.httpClient.get<IidentificationSpecification[]>(apiUri.specsForSlaveId + `${param}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IidentificationSpecification[]>();
      }));;
  }
  getSpecifications(): Observable<ImodbusSpecification[]> {
    return this.httpClient.get<ImodbusSpecification[]>(apiUri.specifications).pipe(
      catchError((err): Observable<ImodbusSpecification[]> => {
        this.loadingError$.next(true);
        this.errorHandler(err);
        return new Observable<ImodbusSpecification[]>();
      }));
  }

  postBus(connection: IModbusConnection, busid?: number): Observable<{ busid: number }> {
    let url = '/api/bus'
    if (busid != undefined)
      url = `${url}?busid=${busid}`
    return this.httpClient.post<{ busid: number }>(url, connection).pipe(
      catchError((err): Observable<{ busid: number }> => {
        this.errorHandler(err);
        return new Observable<{ busid: number }>();
      }));
  }
  postTranslate(originalLanguage: string, translationLanguage: string, text: string[], errorHandler?: (err: HttpErrorResponse) => boolean): Observable<string[]> {
    const httpOptions = {
      headers: {
        'Content-Type': 'application/json',
      }
    };
    const request = {
      contents: text,
      mimeType: "text/plain",
      sourceLanguageCode: originalLanguage,
      targetLanguageCode: translationLanguage
    };

    return this.httpClient.post<string[]>(apiUri.translate, request, httpOptions).pipe(
      catchError((err): Observable<string[]> => {
        if (errorHandler == undefined || !errorHandler(err))
          this.errorHandler(err);
        return new Observable<string[]>();
      }));
  }

  postSpecification(specification: ImodbusSpecification, busid: number, slaveid: number, originalFilename: string | null = null): Observable<ImodbusSpecification> {
    const httpOptions = {
      headers: {
        'Content-Type': 'application/json',
      }
    };
    return this.httpClient.post<ImodbusSpecification>(apiUri.specfication + `?busid=${busid}&slaveid=${slaveid}&originalFilename=${originalFilename}`, specification, httpOptions).pipe(
      catchError((err): Observable<ImodbusSpecification> => {
        this.errorHandler(err);
        return new Observable<ImodbusSpecification>();
      }));
  }

  postSlave(busid: number, device: Islave): Observable<Islave> {
    const httpOptions = {
      headers: {
        'Content-Type': 'application/json',
      }
    };
    let f = apiUri.slave + `?busid=${busid}`;
    console.log(f);
    console.log(JSON.stringify(device));
    return this.httpClient.post<Islave>(f, device, httpOptions).pipe(catchError(err => {
      this.errorHandler(err);
      return new Observable<Islave>();
    }));
  }
  getConfiguration(): Observable<Iconfiguration> {
    return this.httpClient.get<Iconfiguration>(apiUri.configuration).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Iconfiguration>();
      }));
  }
  postConfiguration(config: Iconfiguration): Observable<Iconfiguration> {
    return this.httpClient.post<Iconfiguration>(apiUri.configuration, config).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Iconfiguration>();
      }));
  }
  postModbusEntity(spec: ImodbusSpecification, changedEntity: ImodbusEntity, busid: number, slaveid: number, language: string): Observable<ImodbusEntityWithName> {
    return this.httpClient.post<ImodbusEntity>(apiUri.modbusEntity + `?busid=${busid}&slaveid=${slaveid}&entityid=${changedEntity.id}`, spec).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<ImodbusEntityWithName>();
      }))
  }

  postModbusWriteMqtt(spec: ImodbusSpecification, entityid: number, busid: number, slaveid: number, language: string, mqttValue: string): Observable<string> {
    let lSpec: ImodbusSpecification = structuredClone(spec)
    let entity = lSpec.entities.find(e => e.id == entityid)
    if (entity && editableConverters.includes(entity.converter.name)) {
      switch (entity.converter.name) {
        case 'select':
          I18nService.specificationTextsToTranslation(lSpec, language, entity)
          return this.httpClient.post<string>(apiUri.writeEntity + `?busid=${busid}&slaveid=${slaveid}&entityid=${entityid}&mqttValue=${mqttValue}&language=${language}`, lSpec).pipe(
            catchError(err => {
              this.errorHandler(err);
              return new Observable<string>();
            }));
        default:
          return this.httpClient.post<string>(apiUri.writeEntity + `?busid=${busid}&slaveid=${slaveid}&entityid=${entityid}&mqttValue=${mqttValue}&language=${language}`, lSpec).pipe(
            catchError(err => {
              this.errorHandler(err);
              return new Observable<string>();
            }));
      }
    }
    else
      throw new Error("entityid " + entityid + " not found ");
  }

  postFile(specification: string, usage: SpecificationFileUsage, formData: FormData): Observable<IimageAndDocumentUrl[]> {
    return this.httpClient.post<IimageAndDocumentUrl[]>(apiUri.upload + `?specification=${specification}&usage=${usage}`, formData).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IimageAndDocumentUrl[]>();
      }));
  }
  postAddFilesUrl(specification: string, url: IimageAndDocumentUrl): Observable<IimageAndDocumentUrl[]> {
    return this.httpClient.post<IimageAndDocumentUrl[]>(apiUri.addFilesUrl + `?specification=${specification}`, url).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IimageAndDocumentUrl[]>();
      }));
  }
  postSpecificationContribution(spec: string, note: string): Observable<number> {
    return this.httpClient.post<number>(apiUri.specficationContribute + `?spec=${spec}`, note).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<number>();
      }));
  }
  getForSpecificationValidation(specfilename: string, language: string): Observable<Imessage[]> {
    return this.httpClient.get<Imessage[]>(apiUri.specificationValidate + `?language=${language}&spec=${specfilename}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Imessage[]>();
      }));
  }
  getSpecificationFetchPublic(): Observable<void> {
    return this.httpClient.get<void>(apiUri.specificationFetchPublic).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<void>();
      }));
  }

  postForSpecificationValidation(spec: ImodbusSpecification, language: string): Observable<Imessage[]> {
    return this.httpClient.post<Imessage[]>(apiUri.specificationValidate + `?language=${language}`, spec).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<Imessage[]>();
      }));
  }
  deleteBus(busid: number): Observable<void> {
    return this.httpClient.delete<void>(apiUri.bus + `?busid=${busid}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<void>();
      }));
  }
  deleteSlave(busid: number, slaveid: number): Observable<void> {
    return this.httpClient.delete<void>(apiUri.slave + `?busid=${busid}&slaveid=${slaveid}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<void>();
      }));
  }
  deleteSpecification(specFilename: string): Observable<void> {
    return this.httpClient.delete<void>(apiUri.specfication + `?spec=${specFilename}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<void>();
      }));
  }
  deleteUploadedFile(specfileName: string, url: string, usage: SpecificationFileUsage): Observable<IimageAndDocumentUrl[]> {
    return this.httpClient.delete<IimageAndDocumentUrl[]>(apiUri.upload + `?specification=${specfileName}&url=${url}&usage=${usage}`).pipe(
      catchError(err => {
        this.errorHandler(err);
        return new Observable<IimageAndDocumentUrl[]>();
      }));
  }
}