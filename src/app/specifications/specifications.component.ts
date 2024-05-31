import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api-service';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, first, forkJoin, map } from 'rxjs';
import { IbaseSpecification,  Imessage, ImodbusSpecification, SpecificationStatus, getSpecificationI18nName } from 'specification.shared';
import { SpecificationServices } from '../services/specificationServices';
import { Iconfiguration } from 'server.shared';

interface ImodbusSpecificationWithMessages extends ImodbusSpecification {
  messages: Imessage[]
}

@Component({
  selector: 'app-specifications',
  templateUrl: './specifications.component.html',
  styleUrl: './specifications.component.css'
})

export class SpecificationsComponent implements OnInit {
  config: Iconfiguration;
  contributedSpecificationExists: boolean = false
  private specServices: SpecificationServices | undefined
  specifications: ImodbusSpecificationWithMessages[]
  constructor(private apiService: ApiService, private fb: FormBuilder, private router: Router) {
  }

  fillSpecifications(specs: ImodbusSpecification[]) {
    let a: any = {}
    this.contributedSpecificationExists = false;
    specs.forEach(spec => {
      if (spec.status == SpecificationStatus.contributed)
        this.contributedSpecificationExists = true;
      // Specifications Component doesn't change a Specification
      // for validation of identification, it's better to use the Filespecification
      // This happens in getForSpecificationValidation
      let ox = this.apiService.getForSpecificationValidation(spec.filename, this.config.mqttdiscoverylanguage)
      a[spec.filename] = ox
    })
    forkJoin(a).subscribe((o: any) => {
      Object.entries(o).forEach(([key, value]) => {
        let s: any = specs.find(spec => spec.filename == key);
        if (s)
          (s as ImodbusSpecificationWithMessages).messages = value as any
      })
      this.specifications = specs as ImodbusSpecificationWithMessages[]
    })

  }
  ngOnInit(): void {
    this.apiService.getConfiguration().subscribe((config => {
      this.config = config;
      this.specServices = new SpecificationServices(config.mqttdiscoverylanguage, this.apiService)
      this.apiService.getSpecifications().subscribe(this.fillSpecifications.bind(this))
    }))
  }

  
  importSpecification() {
    throw new Error('Method not implemented.');
  }
  exportSpecification(_spec: ImodbusSpecification) {
    throw new Error('Method not implemented.');
  }
  deleteSpecification(spec: ImodbusSpecification) {
    if (confirm("Are you sure to delete " + this.getTranslatedSpecName(spec))) {
      this.apiService.deleteSpecification(spec.filename).subscribe(() => {
        this.apiService.getSpecifications().subscribe(this.fillSpecifications.bind(this))
        alert(this.getTranslatedSpecName(spec) + " has been deleted");
      })

    }
  }
  getTranslatedSpecName(spec: IbaseSpecification): string | null {
    if (this.config && this.config.mqttdiscoverylanguage && spec)
      return getSpecificationI18nName(spec!, this.config.mqttdiscoverylanguage)
    return null
  }
  contributeSpecification(spec: ImodbusSpecification) {
    this.apiService.postSpecificationContribution(spec.filename, JSON.stringify("Test")).subscribe(_issue => {
      this.apiService.getSpecifications().subscribe(this.fillSpecifications.bind(this))
    })
  }

  canContribute(spec: ImodbusSpecification): Observable<boolean> {
    let rc = ![SpecificationStatus.published, SpecificationStatus.contributed].includes(spec.status)
    if (!rc && !this.contributedSpecificationExists) {
      let s = new Subject<boolean>()
      setTimeout(() => {
        s.next(false)
      }, 1);
      return s.pipe(first())
    }
     // Specifications Component doesn't change a Specification
      // for validation of identification, it's better to use the Filespecification
      // This happens in getForSpecificationValidation
    return  this.apiService.getForSpecificationValidation(spec.filename, this.config.mqttdiscoverylanguage).pipe(map((messages) => {
      return messages.length == 0
    }))
  }

  onSpecificationClick() {
    console.log("click")
  }

  getValidationMessage(spec: IbaseSpecification, message: Imessage): string {
    if (this.specServices)
      return this.specServices.getValidationMessage(spec, message)
    else return "unknown message"
  }

}
