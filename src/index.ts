
import { saveAs } from "file-saver";
import { MakeButton, getParent } from "./core/utils";
import NormalItem from "./situation/NormalItem";
import * as JSZip from "jszip";
import PinItem from "./situation/PinItem";

type ResultType = {
	markdown: string[],
	zip: JSZip,
	title: string,
	dom: HTMLElement,
	itemId?: string,
	question?: boolean,
};

const allResults: ResultType[] = [];

const AddResult = (result: ResultType) => {
	// 如果 result.dom 与其他的 dom 不重复，就添加
	if (allResults.every((item) => item.dom !== result.dom)) allResults.push(result);
};


// 将 allResults[i].zip 合并为一个 zip 并下载
const downloadAllResults = async () => {
	const zip = new JSZip();
	allResults.forEach((item) => {
		const folderName = `${item.title}-${item.itemId}`;

		Object.keys(item.zip.files).forEach(val => {
			zip.files[folderName + "/" + val] = item.zip.files[val];
		});
	});

	saveAs(await zip.generateAsync({ type: "blob" }),
		`问题『${allResults[0].title}』下的${allResults.length}个回答.zip`
	);

	console.log(zip);

	return zip;
};


const main = async () => {

	console.log("Starting…");

	const RichTexts = Array.from(document.querySelectorAll(".RichText")) as HTMLElement[];

	const Titles = Array.from(document.getElementsByClassName("QuestionHeader-title")) as HTMLElement[];

	for (let RichText of RichTexts) {

		try {

			// 去掉重复的按钮
			let RichTextChilren = Array.from(RichText.children) as HTMLElement[];

			for (let i = 1; i < RichTextChilren.length; i++) {
				const el = RichTextChilren[i];
				if (el.classList.contains("zhihucopier-button")) el.remove();
				else break;
			}
		} catch { }

		try {

			try {

				if (RichText.parentElement.classList.contains("Editable")) continue;

				if (RichText.children[0].classList.contains("zhihucopier-button")) continue;

				if (RichText.children[0].classList.contains("Image-Wrapper-Preview")) continue;

				if (getParent(RichText, "PinItem")) {
					const richInner = getParent(RichText, "RichContent-inner");
					if (richInner && richInner.querySelector(".ContentItem-more")) continue;
				};

			} catch { }


			// 按钮组
			const ButtonContainer = document.createElement("div");
			RichText.prepend(ButtonContainer);
			ButtonContainer.classList.add("zhihucopier-button");

			let result: ResultType;

			if (getParent(RichText, "PinItem")) {
				// 想法

				const richInner = getParent(RichText, "RichContent-inner");

				if (richInner && richInner.querySelector(".ContentItem-more")) continue;

				const res = await PinItem(RichText);

				result = {
					markdown: res.markdown,
					zip: res.zip,
					title: res.title,
					dom: RichText,
					itemId: res.itemId,
				};
			} else {
				// 回答

				const res = await NormalItem(RichText);

				result = {
					markdown: res.markdown,
					zip: res.zip,
					title: res.title,
					dom: RichText,
					itemId: res.itemId,
				};

				if (getParent(RichText, "QuestionRichText")) {
					result.question = true;
					result.itemId = "问题描述";
				}
			};

			AddResult(result);


			// 下载为Zip
			const ButtonZipDownload = MakeButton();
			ButtonZipDownload.innerHTML = "下载全文为Zip";
			ButtonZipDownload.style.borderRadius = "0 1em 1em 0";
			ButtonZipDownload.style.width = "100px";
			ButtonZipDownload.style.paddingRight = ".4em";

			ButtonContainer.prepend(ButtonZipDownload);

			ButtonZipDownload.addEventListener("click", async () => {
				try {
					const blob = await result.zip.generateAsync({ type: "blob" });
					saveAs(blob, result.title + "-" + result.itemId + ".zip");

					ButtonZipDownload.innerHTML = "下载成功✅";
					setTimeout(() => {
						ButtonZipDownload.innerHTML = "下载全文为Zip";
					}, 1000);
				} catch {
					ButtonZipDownload.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonZipDownload.style.height = "4em";
					setTimeout(() => {
						ButtonZipDownload.style.height = "2em";
						ButtonZipDownload.innerHTML = "下载全文为Zip";
					}, 1000);
				}
			});


			// 复制为Markdown
			const ButtonCopyMarkdownLink = MakeButton();
			ButtonCopyMarkdownLink.innerHTML = "复制md链接";
			ButtonCopyMarkdownLink.style.borderRadius = "0 0 0 0";
			ButtonCopyMarkdownLink.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonCopyMarkdownLink);

			ButtonCopyMarkdownLink.addEventListener("click", () => {
				try {
					let markdownLink = '';
					let newUrl = '';
					let newTitle = '';

					// 根据result类型拼接url，并转换为markdown格式链接
					if(result.question){
						// 是问题
						// 曾国藩不反清是什么原因导致的？ - 正义骑士团的回答 - 知乎
						// https://www.zhihu.com/question/560253407/answer/3139548615
						const url = location.href;
						const pos = url.indexOf('/answer/');
						newUrl = url.substring(0, pos) + '/answer/' + result.itemId;
						newTitle = result.title;
					}else{
						// 不是问题
						// 专栏文章链接格式
						// YesPlayMusic - 29k star 的开源网易云客户端，你绝对不要错过 - 开源小分队的文章 - 知乎
						// https://zhuanlan.zhihu.com/p/1923833555
						newUrl = location.href;
						newTitle = result.title;
					}
					markdownLink = '[' + newTitle + '](' + location.href + ')';

					navigator.clipboard.writeText(markdownLink);
					ButtonCopyMarkdownLink.innerHTML = "复制成功✅";
					setTimeout(() => {
						ButtonCopyMarkdownLink.innerHTML = "复制md链接";
					}, 1000);
				} catch {
					ButtonCopyMarkdownLink.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonCopyMarkdownLink.style.height = "4em";
					setTimeout(() => {
						ButtonCopyMarkdownLink.style.height = "2em";
						ButtonCopyMarkdownLink.innerHTML = "复制md链接";
					}, 1000);
				}
			});


			// 复制为Markdown
			const ButtonCopyMarkdown = MakeButton();
			ButtonCopyMarkdown.innerHTML = "复制为Markdown";
			ButtonCopyMarkdown.style.borderRadius = "1em 0 0 1em";
			ButtonCopyMarkdown.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonCopyMarkdown);

			ButtonCopyMarkdown.addEventListener("click", () => {
				try {
					navigator.clipboard.writeText(result.markdown.join("\n\n"));
					ButtonCopyMarkdown.innerHTML = "复制成功✅";
					setTimeout(() => {
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
					}, 1000);
				} catch {
					ButtonCopyMarkdown.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonCopyMarkdown.style.height = "4em";
					setTimeout(() => {
						ButtonCopyMarkdown.style.height = "2em";
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
					}, 1000);
				}
			});


		} catch (e) {
			console.log(e);
		}

	}


	// 下载该问题下的所有回答
	Titles.forEach((titleItem) => {


		if (titleItem.querySelector(".zhihucopier-button")) return;

		// 按钮
		const Button = MakeButton();
		Button.style.width = "75px";
		// Button.style.height = "30px";
		Button.style.fontSize = "13px";
		Button.style.lineHeight = "13px";
		Button.style.margin = "0";
		Button.innerHTML = "批量下载";

		Button.classList.add("zhihucopier-button");


		if (getParent(titleItem, "App-main")) {
			titleItem.append(Button);
		} else {
			Button.style.marginRight = ".4em";
			titleItem.prepend(Button);
		}


		Button.addEventListener("click", (e) => {
			e.stopPropagation();
			e.preventDefault();

			try {
				downloadAllResults();
				Button.style.width = "90px";
				Button.innerHTML = "下载成功✅";
				setTimeout(() => {
					Button.innerHTML = "批量下载";
					Button.style.width = "75px";
				}, 1000);

			} catch {
				Button.style.width = "190px";
				Button.innerHTML = "发生未知错误，请联系开发者";
				setTimeout(() => {
					Button.innerHTML = "批量下载";
					Button.style.width = "75px";
				}, 1000);
			}
		});
	});
};


setTimeout(main, 300);

setInterval(main, 1000);