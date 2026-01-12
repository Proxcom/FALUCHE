async function fetchTemplateContent(src) {
    let response = await fetch(src);

    if(response.status !== 200) {
        console.warn(`Unable to fetch content from \"${src}\" (code: ${response.status}): ${response.statusText}`);
        return null;
    }

    return await response.text();
}

// 

function markScriptElementsToReload(element) {
    if(element instanceof HTMLScriptElement && !element.hasAttribute("not-to-reload")) {
        element.setAttribute("to-reload", "");
    }
    else {
        for(child of element.children) {
            markScriptElementsToReload(child);
        }
    }
}

function markScriptElementsToPreventReload(element) {
    if(element instanceof HTMLScriptElement) {
        element.setAttribute("not-to-reload", "");
    }
    else {
        for(child of element.children) {
            markScriptElementsToReload(child);
        }
    }
}

function reloadScriptElement(script_element) {
    if(!(script_element instanceof HTMLScriptElement))
        return false;

    let new_script_element = document.createElement("script");

    const attributes = Array.from(script_element.attributes);
    for(let i = 0; i < attributes.length; ++i) {
        const attribute = attributes[i];
        new_script_element.setAttribute(attribute.name, attribute.value);
    }

    new_script_element.innerHTML = script_element.innerHTML;
    script_element.replaceWith(new_script_element);
}

function processMarkedScriptElements(element) {
    if(element instanceof HTMLScriptElement) {
        if(element.hasAttribute("to-reload")) {
            element.removeAttribute("to-reload");
            reloadScriptElement(element);
        }
        else if(element.hasAttribute("not-to-reload")) {
            element.removeAttribute("not-to-reload");
        }
    }
    else {
        for(child of element.children) {
            processMarkedScriptElements(child);
        }
    }
}

// 

function getAllChildrenElements(element, filter) {
    let result = [];

    if(!filter || filter(element))
        result.push(element);

    for(child of element.children)
        result = result.concat(getAllChildrenElements(child, filter));

    return result;
}

// 

async function process(dom) {
    let template_imports = dom.querySelectorAll("template");

    for(template_element of template_imports) {
        const template_source = template_element.getAttribute("data-src");

        if(
            template_element.getAttribute("data-type") === "import"
            && typeof template_source === "string"
        ) {
            let content = await fetchTemplateContent(template_source);
            
            let container = document.createElement("html");
            container.innerHTML = content;

            // 

            const slot_arguments = Array.from(template_element.content.children).filter(child => child instanceof HTMLSlotElement);
            let slot_argument_map = {};

            for(slot_argument of slot_arguments) {
                const slot_name = slot_argument.getAttribute("name");
                
                if(typeof slot_name === "string")
                    slot_argument_map[slot_name] = slot_argument;
            }

            const slot_parameters = getAllChildrenElements(container, el => el instanceof HTMLSlotElement);
            
            for(slot_parameter of slot_parameters) {
                const slot_name = slot_parameter.getAttribute("name");
                const slot_argument = slot_argument_map[slot_name];

                if(slot_argument instanceof HTMLSlotElement) {
                    for(child of Array.from(slot_argument.children).reverse()) {
                        slot_parameter.insertAdjacentElement("afterend", child);
                        markScriptElementsToPreventReload(child);
                    }

                    slot_parameter.remove();
                }
            }

            // 

            markScriptElementsToReload(container);

            // 

            const template_head = container.children.item(0);

            const template_head_attributes = Array.from(template_head.attributes);
            for(let i = 0; i < template_head_attributes.length; ++i) {
                const attribute = template_head_attributes[i];
                const current_value = document.head.getAttribute(attribute.name);
                
                document.head.setAttribute(attribute.name, (current_value ? current_value + " " : "") + attribute.value);
            }

            document.head.append(...template_head.childNodes);

            // 

            const template_body = container.children.item(1);

            const template_body_attributes = Array.from(template_body.attributes);
            for(let i = 0; i < template_body_attributes.length; ++i) {
                const attribute = template_body_attributes[i];
                const current_value = document.body.getAttribute(attribute.name);
                
                document.body.setAttribute(attribute.name, (current_value ? current_value + " " : "") + attribute.value);
            }

            for(child of Array.from(template_body.children).reverse()) {
                template_element.insertAdjacentElement("afterend", child);
            }

            template_element.remove();

            // 

            processMarkedScriptElements(document.head);
            
            const template_element_parent = template_element.parentNode;
            if(template_element_parent)
                processMarkedScriptElements(template_element_parent);
        }
    }
}

// 

(async () => {
    await process(document);
})();