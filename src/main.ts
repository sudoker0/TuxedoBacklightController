// TODO: Fix bug: dialog

import { invoke } from "@tauri-apps/api/tauri";

type Info = {
    brightness: string,
    color_left: string,
    color_center: string,
    color_right: string,
    color_extra: string,
    mode: string,
    state: string,
}
const INFO_KEY = ["brightness", "color_left", "color_center", "color_right", "color_extra", "mode", "state"]

enum ConfigurableSettingsType {
    COLOR = "color",
    NUMBER = "number",
    BOOLEAN = "boolean"
}

type CKMHeaderData = {
    name: string,
    configurable_settings: {
        id: string,
        description: string,
        type: ConfigurableSettingsType,
    }[],
}
const CKMHEADERDATA_KEY = ["name", "configurable_settings"]
const CKMHEADERDATA_CS_KEY = ["id", "description", "type"]

enum KeyboardRegion {
    LEFT,
    RIGHT,
    MIDDLE,
    EXTRA
}

enum ErrorType {
    MODULE_NOT_FOUND,
    READ_FILE_ERROR,
    WRITE_FILE_ERROR
}

enum DialogType {
    UNRECOVERABLE,
    ALERT,
    CONFIRM
}

const qSel = function<T extends HTMLElement>(sel: string) { return document.querySelector<T>(sel) }
const qSelAll = function<T extends HTMLElement>(sel: string) { return document.querySelectorAll<T>(sel) }

function optionIndexWithValue(selectElm: HTMLSelectElement | null, value: string) {
    var index = 0
    if (selectElm == null) return 0
    selectElm.querySelectorAll("option")
        .forEach((v, k) => {
            if (v.value == value) {
                index = k
                return
            }
        })
    return index
}

function validateNumberInput(elm: HTMLInputElement) {
    elm.value = "1"
    elm.addEventListener("keyup", _ => {
        var value = ""
        for (const i of elm.value) {
            if (i.trim() == "") continue
            if (!isNaN(Number(i))) value += i
        }
        if (value == "") value = "1"
        elm.value = value
    })
}

function checkIfObjectContainsKeys(obj: Object, listOfKeys: string[]) {
    var good = true
    checkKey: for (const key of listOfKeys) {
        var pass = true
        var newObj = obj
        checkSplitKey: for (const k of key.split(".")) {
            if (newObj.hasOwnProperty(k)) {
                //@ts-ignore
                newObj = newObj[k]
            } else {
                pass = false
                break checkSplitKey
            }
        }
        if (!pass) {
            good = false
            break checkKey
        }
    }
    return good
}

function createDialog(title: string, content: string, type: DialogType, id: string = "") {
    const container = qSel("#dialog_container")
    const dialogContainer = document.createElement("div")
    const dialogBackground = document.createElement("div")
    const titleElm = document.createElement("h1")
    const contentElm = document.createElement("p")
    const buttonContainer = document.createElement("div")
    var buttons: HTMLButtonElement[] = []

    const show = () => {
        container?.append(dialogBackground)
        dialogBackground?.classList.remove("hidden")
    }
    const destroy = () => {
        container?.removeChild(dialogBackground)
        dialogBackground?.classList.add("hidden")
    }

    titleElm.innerText = title
    contentElm.innerText = content

    dialogBackground.classList.add("dialog_background", "hidden")
    dialogContainer.classList.add("dialog")
    dialogContainer.id = id
    titleElm.classList.add("dialog_title")
    contentElm.classList.add("dialog_content")
    buttonContainer.classList.add("dialog_buttons")

    switch (type) {
        case DialogType.UNRECOVERABLE:
            break
        case DialogType.ALERT:
            const ok = document.createElement("button")
            ok.innerText = "OK"
            ok.addEventListener("click", destroy)
            buttons.push(ok)
            break
        case DialogType.CONFIRM:
            const yes = document.createElement("button")
            yes.innerText = "Yes"
            const no = document.createElement("button")
            no.innerText = "No"
            yes.addEventListener("click", destroy)
            no.addEventListener("click", destroy)
            buttons.push(yes, no)
            break
    }

    buttonContainer.append(...buttons)
    dialogContainer.append(titleElm, contentElm, buttonContainer)
    dialogBackground.append(dialogContainer)

    return {
        element: dialogContainer,
        show,
        destroy,
    }
}

async function invokeError(errorType: ErrorType) {
    var detail = {
        title: "",
        info: "",
        solutions: ""
    }

    switch (errorType) {
        case ErrorType.MODULE_NOT_FOUND:
            detail.title = "MODULE_NOT_FOUND"
            detail.info = "This program was unable to find the Tuxedo Keyboard kernal module."
            detail.solutions = "If you haven't install the module, follow [https://github.com/tuxedocomputers/tuxedo-keyboard] for information on how to install it. Or if you had already installed it, make sure the module's location is at: \"/sys/devices/platform/tuxedo_keyboard\" and that the program has access to it (try to run the program as root if it doesn't)."
            break
        case ErrorType.READ_FILE_ERROR:
            detail.title = "READ_FILE_ERROR"
            detail.info = "This program was unable to read the configuration file."
            detail.solutions = "Try to run the program as root, and make sure the Tuxedo Keyboard kernal module was installed correctly."
            break
        case ErrorType.WRITE_FILE_ERROR:
            detail.title = "WRITE_FILE_ERROR"
            detail.info = "This program was unable to write the configuration file."
            detail.solutions = "Try to run the program as root, and make sure the Tuxedo Keyboard kernal module was installed correctly."
            break
        default:
            detail.title = "UNKNOWN_ERROR"
            detail.info = "This program has encountered a strange problem."
            detail.solutions = "Report the error back to the dev with Developer Tool and all of it's log."
            break
    }

    const dialog = createDialog(`ERROR: ${detail.title}`, `Detail: ${detail.info}\n\nSolutions: ${detail.solutions}`, DialogType.UNRECOVERABLE)
    dialog.show()

    throw new Error("this is to stop everything")
}

async function checkTuxedoModule() {
    const exist = await invoke("check_tuxedo_module_exist") as boolean
    if (!exist) await invokeError(ErrorType.MODULE_NOT_FOUND)
}

async function getKeyboardInfo() {
    return await invoke("read_tuxedo_config")
}

async function setKeyboardInfo(prevData: Info, data: Info) {
    const success: boolean = await invoke("write_tuxedo_config", {prevInfo: prevData, info: data})
    return success
}

window.addEventListener("DOMContentLoaded", async () => {
    await checkTuxedoModule()

    const enableBl = qSel<HTMLInputElement>("#enableBacklight .function")
    const blMode = qSel<HTMLSelectElement>("#backlightMode .function")
    const brightness = qSel<HTMLInputElement>("#brightness .function")
    const colorMode = qSel<HTMLSelectElement>("#colorMode .function")
    const color = qSel<HTMLInputElement>("#colorSingle .function")
    const colorL = qSel<HTMLInputElement>("#colorLeft .function")
    const colorM = qSel<HTMLInputElement>("#colorMiddle .function")
    const colorR = qSel<HTMLInputElement>("#colorRight .function")
    const colorE = qSel<HTMLInputElement>("#colorExtra .function")
    const registerCKMScriptButton = qSel<HTMLButtonElement>("#register_ckm_script")

    var goodPrevBrightness = "0"
    var infoCopy: Info | null = null
    var single = false

    //? --- CKM related (CKM: Custom Keyboard Mode) ---
    var ckmWorker: Worker | null = null
    var ckmJSCode = ""
    var startCKMLoop = false
    var prevDeltaTime = 0 //? For the CKM loop
    var scriptApplied = false
    var lastInfo: Info | null = null

    const changeEnableBl = async () => {
        if (enableBl == null || infoCopy == null) return
        const enabled = enableBl.checked
        const prevCopy = structuredClone(infoCopy)

        infoCopy.state = enabled ? "1" : "0"
        const good = await setKeyboardInfo(prevCopy, infoCopy)
        if (!good) await invokeError(ErrorType.WRITE_FILE_ERROR)
    }

    //? change blacklight mode
    const changeBlMode = async () => {
        if (blMode == null || infoCopy == null) return
        const mode = blMode.selectedOptions[0].value
        if (mode == "custom") return

        const prevCopy = structuredClone(infoCopy)
        infoCopy.mode = mode
        const good = await setKeyboardInfo(prevCopy, infoCopy)
        if (!good) await invokeError(ErrorType.WRITE_FILE_ERROR)
    }

    const changeBrightness = async () => {
        if (brightness == null || infoCopy == null) return
        const num = Number(brightness.value)

        if (Number.isNaN(num) || brightness.value.length <= 0 || num < 0 || num > 255) brightness.value = goodPrevBrightness
        goodPrevBrightness = brightness.value

        const prevCopy = structuredClone(infoCopy)
        infoCopy.brightness = Number(brightness.value).toString()
        const good = await setKeyboardInfo(prevCopy, infoCopy)
        if (!good) await invokeError(ErrorType.WRITE_FILE_ERROR)
    }

    const changeBlColor = async (region: KeyboardRegion) => {
        if (infoCopy == null || color == null || colorL == null || colorM == null || colorR == null || colorE == null) return
        const prevCopy = structuredClone(infoCopy)

        if (single) {
            infoCopy.color_left = infoCopy.color_right = infoCopy.color_center = infoCopy.color_extra = "0x" + color.value.substring(1)
        } else {
            switch (region) {
                case KeyboardRegion.LEFT:
                    infoCopy.color_left = "0x" + colorL.value.substring(1)
                    break
                case KeyboardRegion.RIGHT:
                    infoCopy.color_right = "0x" + colorR.value.substring(1)
                    break
                case KeyboardRegion.MIDDLE:
                    infoCopy.color_center = "0x" + colorM.value.substring(1)
                    break
                case KeyboardRegion.EXTRA:
                    infoCopy.color_extra = "0x" + colorE.value.substring(1)
                    break
            }
        }

        const good = await setKeyboardInfo(prevCopy, infoCopy)
        if (!good) await invokeError(ErrorType.WRITE_FILE_ERROR)
    }

    function uiRefresh() {
        const needToHide = [2, 3, 4, 5, 6, 7]
        for (const i of needToHide) {
            qSelAll(`.dg-${i}`)
            .forEach(v => v.classList.add(`hidden-dg-${i}`))
        }

        qSelAll(".dg-1")
            .forEach(v => v.classList[enableBl!.checked ? "remove" : "add"]("hidden-dg-1"))

        qSelAll(".dg-6")
            .forEach(v => v.classList[scriptApplied ? "add" : "remove"]("hidden-dg-6"))
        qSelAll(".dg-7")
            .forEach(v => v.classList[scriptApplied ? "remove" : "add"]("hidden-dg-7"))

        switch (blMode!.selectedOptions[0].value) {
            case "0":
                qSelAll(".dg-2")
                    .forEach(v => v.classList.remove("hidden-dg-2"))
                break
            case "custom":
                qSelAll(".dg-5")
                    .forEach(v => v.classList.remove("hidden-dg-5"))
                break
        }

        switch (colorMode!.selectedOptions[0].value) {
            case "single":
                single = true
                qSelAll(".dg-3")
                    .forEach(v => v.classList.remove("hidden-dg-3"))
                break
            case "multiple":
                single = false
                qSelAll(".dg-4")
                    .forEach(v => v.classList.remove("hidden-dg-4"))
                break
        }

        requestAnimationFrame(uiRefresh)
    }

    async function initValue() {
        const info = (await getKeyboardInfo()) as [Info, boolean]
        const success = info[1]
        if (!success) await invokeError(ErrorType.READ_FILE_ERROR)

        for (const i in info[0]) {
            info[0][i as keyof typeof info[0]] = info[0][i as keyof typeof info[0]].trim()
        }

        infoCopy = info[0]
        switch (info[0].state) {
            case "0":
                enableBl!.checked = false
                break
            case "1":
                enableBl!.checked = true
                break
        }
        blMode!.selectedIndex = optionIndexWithValue(blMode, info[0].mode)
        brightness!.value = info[0].brightness
        color!.value = "#" + info[0].color_left.substring(2)
        colorL!.value = "#" + info[0].color_left.substring(2)
        colorM!.value = "#" + info[0].color_center.substring(2)
        colorR!.value = "#" + info[0].color_right.substring(2)
        colorE!.value = "#" + info[0].color_extra.substring(2)
        const c = [info[0].color_left, info[0].color_center, info[0].color_right, info[0].color_extra]
        colorMode!.selectedIndex = c.every((v, i, a) => i === 0 || v === a[i - 1]) ? 0 : 1
    }

    const beginCustomKeyboardMode = async (jscode: string) => {
        return new Promise((resolve, reject) => {
            const timeOutTimer = setTimeout(() => {
                errorHandle(
                    "ERROR: TIMED_OUT",
                    "The provided script did not respond. Please check if the script was set up correctly.")
            }, 5000) //! change

            const errorHandle = (title: string, description: string) => {
                console.log("error")
                createDialog(title, description, DialogType.ALERT).show()
                startCKMLoop = false
                reject()
            }
            const settingsPage = qSel("#ckm_configurable_settings")
            if (settingsPage == null) return

            while (settingsPage.lastElementChild) {
                settingsPage.removeChild(settingsPage.lastElementChild);
            }

            ckmWorker = new Worker(`data:text/javascript;base64,${btoa(jscode)}`)
            //? Ask the CKM for info including:
            //? name and list of settings user can configure that the CKM can use.
            ckmWorker.postMessage({"status": "need_more_info"})
            ckmWorker.addEventListener("message", (ev) => {
                const data = ev.data as CKMHeaderData
                if (!checkIfObjectContainsKeys(data, CKMHEADERDATA_KEY)) {
                    errorHandle(
                        "ERROR: INVALID_SCRIPT",
                        "The provided script has send invalid data to the program. Please check the script for error and the documentation for more info.")
                    clearTimeout(timeOutTimer)
                    return
                }

                for (const i of data!.configurable_settings) {
                    if (!checkIfObjectContainsKeys(i, CKMHEADERDATA_CS_KEY)) {
                        errorHandle(
                            "ERROR: INVALID_SCRIPT",
                            "The provided script has send invalid data to the program. Please check the script for error and the documentation for more info.")
                        clearTimeout(timeOutTimer)
                        return
                    }

                    const textElm = document.createElement("label")
                    var inputElm: HTMLElement | null = null
                    textElm.innerText = i.description

                    switch (i.type) {
                        case ConfigurableSettingsType.NUMBER:
                            inputElm = document.createElement("input")
                            inputElm.setAttribute("type", "number")
                            inputElm.setAttribute("data-type", ConfigurableSettingsType.NUMBER)
                            inputElm.classList.add("function")
                            validateNumberInput(inputElm as HTMLInputElement)
                            break
                        case ConfigurableSettingsType.COLOR:
                            inputElm = document.createElement("input")
                            inputElm.setAttribute("type", "color")
                            inputElm.setAttribute("data-type", ConfigurableSettingsType.COLOR)
                            inputElm.classList.add("function")
                            break
                        case ConfigurableSettingsType.BOOLEAN:
                            inputElm = document.createElement("label")
                            inputElm.classList.add("switch")

                            const switchInput = document.createElement("input")
                            const switchSlider = document.createElement("span")
                            switchInput.setAttribute("type", "checkbox")
                            switchInput.setAttribute("data-type", ConfigurableSettingsType.BOOLEAN)
                            switchInput.classList.add("function")
                            switchSlider.classList.add("slider")

                            inputElm.append(switchInput, switchSlider)
                            break
                    }

                    const container = document.createElement("div")
                    const left = document.createElement("div")
                    const right = document.createElement("div")
                    container.setAttribute("data-configurable", i.id)
                    container.classList.add("row", "ckm-setting")
                    left.classList.add("left")
                    right.classList.add("right")

                    left.append(textElm)
                    right.append(inputElm)
                    container.append(left, right)

                    settingsPage.append(container)
                }

                const startButton = document.createElement("button")
                const stopButton = document.createElement("button")
                const setScriptButton = document.createElement("button")
                const buttonContainer = document.createElement("div")
                stopButton.disabled = true

                startButton.innerText = "Start"
                startButton.addEventListener("click", () => {
                    if (startCKMLoop) return
                    lastInfo = structuredClone(infoCopy)

                    startCKMLoop = true
                    startButton.disabled = true
                    stopButton.disabled = false

                    if (ckmWorker == null) ckmWorker = new Worker(`data:text/javascript;base64,${btoa(jscode)}`)
                    ckmWorker.addEventListener("message", async (ev) => {
                        const newInfo = JSON.parse(JSON.stringify(ev.data)) as Info
                        if (checkIfObjectContainsKeys(newInfo, INFO_KEY) && infoCopy != null) {
                            const good = await setKeyboardInfo(infoCopy, newInfo)
                            if (!good) {
                                errorHandle(
                                    "ERROR: INVALID_SCRIPT",
                                    "The provided script has send invalid data to the program. Please check the script for error and the documentation for more info.")
                                stopCustomKeyboardMode()
                                return
                            }

                            if (startCKMLoop) requestAnimationFrame(startCustomKeyboardMode)
                            infoCopy = newInfo
                        } else {
                            errorHandle(
                                "ERROR: INVALID_SCRIPT",
                                "The provided script has send invalid data to the program. Please check the script for error and the documentation for more info.")
                            stopCustomKeyboardMode()
                            return
                        }
                    })
                    requestAnimationFrame(startCustomKeyboardMode)
                })

                stopButton.innerText = "Stop"
                stopButton.addEventListener("click", async () => {
                    if (infoCopy == null) return
                    stopCustomKeyboardMode()
                    startButton.disabled = false
                    stopButton.disabled = true

                    if (lastInfo != null)
                        await setKeyboardInfo(infoCopy, lastInfo)
                    lastInfo = null
                })

                setScriptButton.innerText = "Change script"
                setScriptButton.addEventListener("click", async () => {
                    if (infoCopy == null) return
                    scriptApplied = false
                    startButton.disabled = true
                    stopButton.disabled = false
                    stopCustomKeyboardMode()

                    if (lastInfo != null)
                        await setKeyboardInfo(infoCopy, lastInfo)
                    lastInfo = null
                })

                buttonContainer.append(startButton, stopButton, setScriptButton)
                settingsPage.append(buttonContainer)

                clearTimeout(timeOutTimer)
                resolve(null)
            }, {
                once: true
            })
        })
    }

    const startCustomKeyboardMode = async (newDeltaTime: number) => {{
        if (!startCKMLoop) return
        const delta = newDeltaTime - prevDeltaTime
        prevDeltaTime = newDeltaTime
        if (delta > 1100) {
            requestAnimationFrame(startCustomKeyboardMode)
            return
        }

        var settings: { [key: string]: string | boolean | number | null }= {}
        qSelAll(".ckm-setting").forEach(v => {
            const func = v.querySelector(".function")
            var key = v.getAttribute("data-configurable") ?? ""
            var value = null

            switch (func?.getAttribute("data-type")) {
                case ConfigurableSettingsType.BOOLEAN:
                    value = (func as HTMLInputElement).checked
                    break
                case ConfigurableSettingsType.COLOR:
                    value = (func as HTMLInputElement).value
                    break
                case ConfigurableSettingsType.NUMBER:
                    value = Number((func as HTMLInputElement).value)
                    break
            }

            settings[key] = value
        })

        ckmWorker?.postMessage({
            "status": "continue",
            "current_state": infoCopy,
            "settings": settings,
            "delta_time": delta / 1000
        })
    }}

    const stopCustomKeyboardMode = () => {{
        ckmWorker?.terminate()
        startCKMLoop = false
        ckmWorker = null
    }}

    const registerCKMScript = async () => {
        const elm = qSel<HTMLTextAreaElement>("#ckm_script")
        ckmJSCode = elm?.value || ""
        const dialog = createDialog("", "Please wait...", DialogType.UNRECOVERABLE)
        var good = true
        dialog.show()

        await beginCustomKeyboardMode(ckmJSCode)
            .catch(_ => {
                console.log("error")
                dialog.destroy()
                good = false
            })

        if (!good) return
        scriptApplied = true
        dialog.destroy()
    }

    uiRefresh()
    await initValue()

    //! ckmJSCode will be set here, somewhere
    enableBl?.addEventListener("change", changeEnableBl)
    blMode?.addEventListener("change", changeBlMode)
    brightness?.addEventListener("change", changeBrightness)
    brightness?.addEventListener("keyup", changeBrightness)
    color?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.LEFT); await initValue() })
    colorL?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.LEFT); await initValue() })
    colorM?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.MIDDLE); await initValue() })
    colorR?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.RIGHT); await initValue() })
    colorE?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.EXTRA); await initValue() })
    registerCKMScriptButton?.addEventListener("click", registerCKMScript)
})