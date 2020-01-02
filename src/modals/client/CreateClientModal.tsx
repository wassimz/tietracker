import React, {FormEvent, RefObject, CSSProperties, useEffect, useState, useRef} from 'react';
import {
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonCheckbox
} from '@ionic/react';

import {useSelector} from 'react-redux';

import {more} from 'ionicons/icons';

import styles from './CreateClientModal.module.scss';

import {Client, ClientData} from '../../models/client';
import {RootProps, rootConnector} from '../../store/thunks/index.thunks';
import {ProjectData} from '../../models/project';

import {contrast} from '../../utils/utils.color';

import {ThemeService} from '../../services/theme/theme.service';
import {Settings} from '../../models/settings';

import {RootState} from '../../store/reducers';

interface Props extends RootProps {
    closeAction: Function;
    open: boolean;
}

const CreateClientModal: React.FC<Props> = (props: Props) => {

    const settings: Settings = useSelector((state: RootState) => state.settings.settings);
    
    const clientNameRef: RefObject<any> = useRef();
    const clientColorRef: RefObject<any> = useRef();
    const projectNameRef: RefObject<any> = useRef();
    const projectRateRef: RefObject<any> = useRef();
    
    const [projectData, setProjectData] = useState<ProjectData | undefined>(undefined);
    const [validClient, setValidClient] = useState<boolean>(false);
    const [validProject, setValidProject] = useState<boolean>(false);

    // Access state in event listener trick: https://medium.com/geographit/accessing-react-state-in-event-listeners-with-usestate-and-useref-hooks-8cceee73c559
    const [clientData, _setClientData] = useState<ClientData | undefined>(undefined);
    const clientDataRef = useRef<ClientData | undefined>(clientData);
    const setClientData = (data: ClientData | undefined) => {
        clientDataRef.current = data;
        _setClientData(data);
    };

    useEffect(() => {
        if (props.open) {
            clientColorRef.current.addEventListener('colorChange', selectColor, false);
        } else {
            clientColorRef.current.removeEventListener('colorChange', selectColor, true);
        }
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open]);

    function handleClientNameInput($event: CustomEvent<KeyboardEvent>) {
        let data: ClientData;

        if (clientData) {
            data = {...clientData};
            data.name = ($event.target as InputTargetEvent).value;
        } else {
            data = {
                name: ($event.target as InputTargetEvent).value
            };
        }

        setClientData(data);
    }

    function validateClientName() {
        setValidClient(clientData !== undefined && clientData.name !== undefined && clientData.name.length >= 3);
    }

    const selectColor = ($event: CustomEvent) => {
        if (!clientDataRef.current) {
            return;
        }

        const data: ClientData = {...clientDataRef.current};
        data.color = $event.detail.hex;
        setClientData(data);
    };

    function handleProjectNameInput($event: CustomEvent<KeyboardEvent>) {
        if (!clientData) {
            return;
        }

        let data: ProjectData;

        if (projectData) {
            data = {...projectData};
            data.name = ($event.target as InputTargetEvent).value;
        } else {
            data = {
                name: ($event.target as InputTargetEvent).value,
                disabled: false,
                rate: {
                    hourly: 0,
                    vat: settings.vat !== undefined
                }
            };
        }

        setProjectData(data);
    }

    function handleProjectRateInput($event: CustomEvent<KeyboardEvent>) {
        if (!clientData) {
            return;
        }

        let data: ProjectData;

        if (projectData) {
            data = {...projectData};
            data.rate.hourly = parseInt(($event.target as InputTargetEvent).value);
        } else {
            data = {
                name: '',
                disabled: false,
                rate: {
                    hourly: parseInt(($event.target as InputTargetEvent).value),
                    vat: settings.vat !== undefined
                }
            };
        }

        setProjectData(data);
    }

    function validateProject() {
        setValidProject(projectData !== undefined && projectData.name !== undefined && projectData.name.length >= 3 && projectData.rate && projectData.rate.hourly >= 0);
    }

    async function handleSubmit($event: FormEvent<HTMLFormElement>) {
        $event.preventDefault();

        if (clientData === undefined || projectData === undefined) {
            return;
        }

        try {
            const persistedClient: Client = await props.createClient(clientData);

            if (!persistedClient || persistedClient === undefined || !persistedClient.id || persistedClient.id === undefined) {
                // TODO: Error management
                // And what if client withtout project? duplicated? -> delete whatever function
                console.error('Client not created');
                return;
            }

            await props.createProject(persistedClient, projectData);

            await props.closeAction();

            reset();
        } catch (err) {
            console.error(err);
        }
    }

    function reset() {
        setClientData(undefined);
        setProjectData(undefined);
        setValidProject(false);
        setValidClient(false);

        clientNameRef.current.value = undefined;
        clientColorRef.current.value = undefined;
        projectNameRef.current.value = undefined;
        projectRateRef.current.value = undefined;
    }

    function onVatChange($event: CustomEvent) {
        if (!$event || !$event.detail) {
            return;
        }

        if (!clientData) {
            return;
        }

        let data: ProjectData;

        if (projectData) {
            data = {...projectData};
            data.rate.vat = $event.detail.checked;
        } else {
            data = {
                name: '',
                disabled: false,
                rate: {
                    hourly: 0,
                    vat: $event.detail.checked
                }
            };
        }
        
        setProjectData(data);
    }

    return renderContent();

    function renderContent() {
        const valid: boolean = validClient && validProject;

        const color: string | undefined = clientData ? clientData.color : undefined;
        const colorContrast: string = contrast(color, 128, ThemeService.getInstance().isDark());

        return <IonContent>
            <IonHeader>
                <IonToolbar style={{'--background': color, '--color': colorContrast, '--ion-toolbar-color': colorContrast} as CSSProperties}>
                    <IonTitle>Add a new client</IonTitle>
                    <IonButtons slot="start">
                        <IonButton onClick={() => props.closeAction()}>
                            <IonIcon name="close" slot="icon-only"></IonIcon>
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <main className="ion-padding">
                <form onSubmit={($event: FormEvent<HTMLFormElement>) => handleSubmit($event)}>
                    <IonList className="inputs-list">
                        <IonItem className="item-title">
                            <IonLabel>Client</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonInput ref={clientNameRef} debounce={500} minlength={3} maxlength={32}
                                      required={true} input-mode="text"
                                      onIonInput={($event: CustomEvent<KeyboardEvent>) => handleClientNameInput($event)}
                                      onIonChange={() => validateClientName()}>
                            </IonInput>
                        </IonItem>

                        <IonItem disabled={!validClient} className="item-title ion-margin-top">
                            <IonLabel>Color</IonLabel>
                        </IonItem>

                        <div className={styles.color + ` ${!validClient ? 'disabled' : ''}`}>
                            <deckgo-color ref={clientColorRef}
                                          className="ion-padding-start ion-padding-end ion-padding-bottom"
                                          more={true}>
                                <IonIcon icon={more} slot="more" aria-label="More" class="more"></IonIcon>
                            </deckgo-color>
                        </div>

                        <IonItem disabled={!validClient} className="item-title ion-margin-top">
                            <IonLabel>Project</IonLabel>
                        </IonItem>
                        <IonItem disabled={!validClient}>
                            <IonInput ref={projectNameRef} debounce={500} minlength={3} maxlength={32}
                                      required={true} input-mode="text"
                                      onIonInput={($event: CustomEvent<KeyboardEvent>) => handleProjectNameInput($event)}
                                      onIonChange={() => validateProject()}>
                            </IonInput>
                        </IonItem>

                        <IonItem disabled={!validClient} className="item-title">
                            <IonLabel>Hourly rate</IonLabel>
                        </IonItem>
                        <IonItem disabled={!validClient}>
                            <IonInput ref={projectRateRef} debounce={500} minlength={1} required={true}
                                      input-mode="text"
                                      onIonInput={($event: CustomEvent<KeyboardEvent>) => handleProjectRateInput($event)}
                                      onIonChange={() => validateProject()}>
                            </IonInput>
                        </IonItem>

                        {renderVat(color)}
                    </IonList>

                    <IonButton type="submit" className="ion-margin-top" disabled={!valid} style={{'--background': color, '--color': colorContrast, '--background-hover': color, '--color-hover': colorContrast, '--background-activated': colorContrast, '--color-activated': color} as CSSProperties}>
                        <IonLabel>Submit</IonLabel>
                    </IonButton>
                </form>
            </main>
        </IonContent>
    }

    function renderVat(color: string | undefined) {
        if (!settings.vat || settings.vat === undefined) {
            return undefined;
        }

        return <>
            <IonItem disabled={!validClient} className="item-title">
                <IonLabel>Vat</IonLabel>
            </IonItem>
            <IonItem disabled={!validClient} className="item-checkbox">
                <IonLabel>{settings.vat}%</IonLabel>
                <IonCheckbox slot="end" style={{'--background-checked': color, '--border-color-checked': color} as CSSProperties}
                             checked={projectData ? projectData.rate.vat : false}
                             onIonChange={($event: CustomEvent) => onVatChange($event)}></IonCheckbox>
            </IonItem>
        </>
    }

};

export default rootConnector(CreateClientModal);
