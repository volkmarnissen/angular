import { IbaseSpecification, Imessage, ImodbusSpecification, MessageTypes, getSpecificationI18nEntityName } from "specification.shared";
import { ApiService } from "./api-service";
import { Observable } from "rxjs";

export class SpecificationServices {
    constructor(private mqttdiscoverylanguage: string, private apiService: ApiService) {

    }
    getValidationMessages(spec: ImodbusSpecification, forContribution: boolean): Observable<Imessage[]> {
        if (!spec)
            throw new Error("spec is undefined")

        return this.apiService.postForSpecificationValidation(spec, this.mqttdiscoverylanguage)
    }
    getValidationMessage(spec: IbaseSpecification, message: Imessage): string {
        switch (message.type) {
            case MessageTypes.noDocumentation: return ($localize`No documenation file or URL`);
            case MessageTypes.nameTextMissing: return ($localize`The specification has no Name`);
            case MessageTypes.entityTextMissing: {
                let entName: string | null = ""
                if (spec && undefined != message.referencedEntity)
                    entName = getSpecificationI18nEntityName(spec!, this.mqttdiscoverylanguage, message.referencedEntity)
                let rc = ($localize`entity has no name`)
                if (entName)
                    rc = rc + ": " + entName;
                if (message.additionalInformation)
                    rc = rc + "(" + message.additionalInformation + ")"
                return rc;
            }

            case MessageTypes.translationMissing: return ($localize`A translation is missing` + ": " + message.additionalInformation);
            case MessageTypes.noEntity: return ($localize`No entity defined for this specification`);
            case MessageTypes.noDocumentation: return ($localize`No dcoumenation file or URL`);
            case MessageTypes.noImage: return ($localize`No image file or URL`);
            case MessageTypes.nonUniqueName: return ($localize`Specification name is not unique`);
            case MessageTypes.identifiedByOthers: {
                let specNames: string = ""
                message.additionalInformation.forEach((name: string) => { specNames = specNames + name + " " })
                return ($localize`Test data of this specification matches to the following other public specifications ${specNames}`);
            }
            case MessageTypes.nonUniqueName: return ($localize` The name is already available in public ` + ": " + message.additionalInformation)
            case MessageTypes.notIdentified: return ($localize` The specification can not be identified with it's test data`)
        }
        return "unknown message";
    }
}
