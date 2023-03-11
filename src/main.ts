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

interface Template {
    [key: string]: string
}

function replaceHTML(elm: HTMLElement, data: Template, prefix: string = "$_") {
    const alternate_prefix = "id_dlr_";

    for (const i in data) {
        const old = elm.innerHTML;
        const span: () => HTMLElement | null = () =>
            elm.querySelector(`span.reactive#${alternate_prefix}${i}`)
        if (span() == null) elm.innerHTML =
            old.replace(`${prefix}${i}`, `
                <span class="reactive" id="${alternate_prefix}${i}"></span>`)
        span()!.innerText = data[i]
    }
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

async function invokeError(errorType: ErrorType) {
    const error_dialog = qSel("#error")
    if (error_dialog == null) return
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

    replaceHTML(error_dialog, {
        error_title: detail.title,
        error_detail: detail.info,
        error_solutions: detail.solutions
    })

    qSel("#error")?.classList.remove("hidden")
    qSel("#main")?.classList.add("hidden")

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
    const success = await invoke("write_tuxedo_config", {prevInfo: prevData, info: data})
    if (!success) await invokeError(ErrorType.WRITE_FILE_ERROR)
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

    var goodPrevBrightness = "0"
    var infoCopy: Info | null = null
    var single = false

    const changeEnableBl = async () => {
        if (enableBl == null || infoCopy == null) return
        const enabled = enableBl.checked
        const prevCopy = structuredClone(infoCopy)

        infoCopy.state = enabled ? "1" : "0"
        await setKeyboardInfo(prevCopy, infoCopy)
    }

    //? change blacklight mode
    const changeBlMode = async () => {
        if (blMode == null || infoCopy == null) return
        const mode = blMode.selectedOptions[0].value
        console.log(mode)

        if (mode == "custom") {
            return
        }

        const prevCopy = structuredClone(infoCopy)
        infoCopy.mode = mode
        await setKeyboardInfo(prevCopy, infoCopy)
    }

    const changeBrightness = async () => {
        if (brightness == null || infoCopy == null) return
        const num = Number(brightness.value)

        if (Number.isNaN(num) || brightness.value.length <= 0 || num < 0 || num > 255) brightness.value = goodPrevBrightness
        goodPrevBrightness = brightness.value

        const prevCopy = structuredClone(infoCopy)
        infoCopy.brightness = Number(brightness.value).toString()
        await setKeyboardInfo(prevCopy, infoCopy)
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

        await setKeyboardInfo(prevCopy, infoCopy)
    }

    function uiRefresh() {
        qSelAll(".dg-1")
            .forEach(v => v.classList[enableBl!.checked ? "remove" : "add"]("hidden-dg-1"))
        qSelAll(".dg-2")
            .forEach(v => v.classList.add("hidden-dg-2"))
        qSelAll(".dg-3")
            .forEach(v => v.classList.add("hidden-dg-3"))
        qSelAll(".dg-4")
            .forEach(v => v.classList.add("hidden-dg-4"))

        switch (blMode!.selectedOptions[0].value) {
            case "0":
                qSelAll(".dg-2")
                    .forEach(v => v.classList.remove("hidden-dg-2"))
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
        color!.value = "#" + info[0].color_left
        colorL!.value = "#" + info[0].color_left
        colorM!.value = "#" + info[0].color_center
        colorR!.value = "#" + info[0].color_right
        colorE!.value = "#" + info[0].color_extra
        const c = [info[0].color_left, info[0].color_center, info[0].color_right, info[0].color_extra]
        colorMode!.selectedIndex = c.every((v, i, a) => i === 0 || v === a[i - 1]) ? 0 : 1
    }

    uiRefresh()
    await initValue()

    enableBl?.addEventListener("change", changeEnableBl)
    blMode?.addEventListener("change", changeBlMode)
    brightness?.addEventListener("change", changeBrightness)
    brightness?.addEventListener("keyup", changeBrightness)
    color?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.LEFT); await initValue() })
    colorL?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.LEFT); await initValue() })
    colorM?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.MIDDLE); await initValue() })
    colorR?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.RIGHT); await initValue() })
    colorE?.addEventListener("change", async () => { await changeBlColor(KeyboardRegion.EXTRA); await initValue() })
})