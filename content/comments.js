function setSidebarCommentsOpen(open) {
  const doc = JR.readerDocument;
  if (!doc) return;
  doc.body.classList.toggle("simple-with-comments", open);
  const container = doc.querySelector(".simple-container");
  if (container) container.classList.toggle("simple-with-comments", open);
}

function syncSidebarCommentsLayout() {
  const remaining = JR.readerDocument.querySelectorAll(
    ".simple-comment-container",
  ).length;
  setSidebarCommentsOpen(remaining > 0);
}

function addComment(loc) {
  if (!JR.readerDocument.body.classList.contains("simple-deleting")) {
    setSidebarCommentsOpen(true);
    JR.readerDocument.body.classList.add("simple-commenting");

    // Add the compact comment
    let compactComment = document.createElement("a");
    compactComment.className = "simple-comment-link";
    let commentId = "jr-" + Date.now();
    compactComment.href = "#" + commentId;
    compactComment.innerText = "[*]";
    compactComment.style.top = loc.y + "px";
    compactComment.onclick = linkListener;
    JR.compactComments.appendChild(compactComment);

    // Add the comment
    const commentContainer = document.createElement("div");
    commentContainer.id = commentId;
    commentContainer.className = "simple-comment-container jr-adding";

    const styling = document.createElement("div");
    styling.className = "simple-comment-styling";

    const textarea = document.createElement("textarea");
    textarea.onkeydown = onCommentInput;
    textarea.onkeyup = onCommentInput;
    styling.appendChild(textarea);

    const postBtn = document.createElement("button");
    postBtn.className = "jr-post";
    postBtn.innerText = t("commentButton");
    postBtn.disabled = true;
    postBtn.onclick = placeComment;
    styling.appendChild(postBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel";
    cancelBtn.innerText = t("cancelButton");
    cancelBtn.onclick = cancelComment;
    styling.appendChild(cancelBtn);

    commentContainer.appendChild(styling);

    commentContainer.style.top = loc.y + "px";

    JR.comments.appendChild(commentContainer);

    textarea.focus();
    setTimeout(function () {
      if (JR.readerDocument.body.classList.contains("simple-compact-view"))
        commentContainer.scrollIntoView();
    }, 50);
  }
}

function onCommentInput() {
  if (this.value !== "") {
    this.nextSibling.disabled = false;
  } else {
    this.nextSibling.disabled = true;
  }
  this.style.height = "auto";
  this.style.height = this.scrollHeight + 10 + "px";
}

function placeComment() {
  markSharedPageDirty();

  JR.readerDocument.body.classList.remove("simple-commenting");

  const parent = this.parentElement;

  parent.parentElement.classList.remove("jr-adding");
  parent.parentElement.classList.add("jr-posted");

  const date = new Date();
  const dateString =
    date.getMonth() +
    1 +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear() +
    " at " +
    date.getHours() +
    ":" +
    date.getMinutes();
  const timestamp = document.createElement("div");
  timestamp.className = "jr-timestamp";
  timestamp.innerText = commentLeftOnPrefix() + dateString;

  const textarea = parent.querySelector("textarea");

  const comment = document.createElement("p");
  comment.className = "simple-comment";
  comment.innerText = textarea.value;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-button";
  deleteBtn.innerText = "X";

  const backBtn = document.createElement("button");
  backBtn.className = "back-to-ref";
  backBtn.innerText = "↑";
  backBtn.onclick = function () {
    JR.readerDocument.defaultView.scrollTo(0, this.dataset.scrollPos);
  };

  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  parent.appendChild(timestamp);
  parent.appendChild(comment);
  parent.appendChild(deleteBtn);
  parent.appendChild(backBtn);
  bindPostedSidebarComment(parent.parentElement);

  updateSavedVersion();
}

function cancelComment(e, el) {
  const box =
    el ||
    (this && this.closest && this.closest(".simple-comment-container"));
  if (!box) return;

  const compact = findCompactComment(box);
  if (compact && compact.parentElement) {
    compact.parentElement.removeChild(compact);
  }
  if (box.parentElement) {
    box.parentElement.removeChild(box);
  }

  syncSidebarCommentsLayout();
  JR.readerDocument.body.classList.remove("simple-commenting");
}

function deletePostedComment(styling) {
  const box = styling && styling.parentElement;
  if (!box) return;
  recordAction("delete-comment", box);
}

function bindPostedSidebarComment(box) {
  const styling = box.querySelector(".simple-comment-styling");
  if (!styling) return;

  let deleteBtn = styling.querySelector(".delete-button");
  if (!deleteBtn) {
    deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.innerText = "X";
    styling.appendChild(deleteBtn);
  }
  deleteBtn.onclick = function () {
    deletePostedComment(styling);
  };
}

function bindInlineCommentSection(section) {
  if (!section || !JR.readerDocument) return;

  const content = section.querySelector(".jr-user-content");
  if (content) content.setAttribute("contenteditable", true);

  let deleteButton = section.querySelector(".jr-user-content-delete");
  if (!deleteButton) {
    deleteButton = JR.readerDocument.createElement("button");
    deleteButton.className = "jr-user-content-delete";
    deleteButton.innerText = "X";
    deleteButton.ariaLabel = "Delete comment";
    section.appendChild(deleteButton);
  }
  deleteButton.onclick = function () {
    if (!section.parentElement) return;
    if (content && content.innerText.trim() === "") {
      section.parentElement.removeChild(section);
      return;
    }
    recordAction("delete", section);
  };

  if (!content || content.dataset.jrBound) return;
  content.dataset.jrBound = "1";

  content.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      JR.readerDocument.execCommand("formatBlock", false, "p");
    }
  });
  content.addEventListener("blur", () => {
    if (content.innerText.trim() === "" && section.parentElement) {
      section.parentElement.removeChild(section);
    }
  });
  section.addEventListener("click", () => {
    content.focus();
    const range = JR.readerDocument.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const selection = JR.readerDocument.defaultView.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function rewireExistingComments() {
  if (JR.comments) {
    JR.comments
      .querySelectorAll(".simple-comment-container")
      .forEach(bindPostedSidebarComment);
  }

  if (JR.compactComments) {
    JR.compactComments.querySelectorAll(".simple-comment-link").forEach((a) => {
      a.onclick = linkListener;
    });
  }

  if (!JR.readerDocument) return;
  JR.readerDocument
    .querySelectorAll(".jr-user-content-section")
    .forEach(bindInlineCommentSection);
}

function handlePointerMove(e) {
  let leftEdge, rightEdge;
  if (
    !JR.readerDocument
      .querySelector(".simple-container")
      .classList.contains("rtl")
  ) {
    const edge = JR.readerDocument
      .querySelector(".simple-article-container")
      .getBoundingClientRect().right;
    leftEdge = edge - 70;
    rightEdge = edge + 170;
  } else {
    const edge = JR.readerDocument
      .querySelector(".simple-article-container")
      .getBoundingClientRect().left;
    leftEdge = edge - 170;
    rightEdge = edge + 70;
  }
  const paddingTop = parseInt(
    window
      .getComputedStyle(JR.readerDocument.querySelector(".simple-container"))
      .getPropertyValue("padding-top")
  );
  if (e.clientX > leftEdge && e.clientX < rightEdge) {
    JR.readerDocument.body.classList.add("simple-show-adder");
    JR.addCommentBtn.style.top =
      e.clientY - paddingTop + JR.readerDocument.defaultView.scrollY - 27;
  } else {
    JR.readerDocument.body.classList.remove("simple-show-adder");
  }
}

// Inline comment functionality
function addInlineCommentFunctionality() {
  const MAX_TRIES_PER_DIR = 10;
  const PX_SHIFT_EACH_TRY = 2;
  const NUM_PARENTS_TO_CHECK_FOR_ANCHOR = 10;

  function findClosestPToClick(e) {
    const x = e.pageX;
    const y = e.clientY;
    const above_res = checkNearbyPosForP(
      x,
      y,
      -PX_SHIFT_EACH_TRY,
      MAX_TRIES_PER_DIR
    );
    const above_dist = above_res ? Math.abs(y - above_res.y) : Infinity;
    const below_res = checkNearbyPosForP(
      x,
      y,
      PX_SHIFT_EACH_TRY,
      MAX_TRIES_PER_DIR
    );
    const below_dist = below_res ? Math.abs(y - below_res.y) : Infinity;

    if (above_dist <= below_dist) {
      if (above_dist === 0) {
        const el_height = above_res.el.offsetHeight;
        if (Math.sign(e.offsetY - el_height / 2) < 0) {
          return {
            el: above_res?.el,
            place_before: true,
          };
        }
        return {
          el: above_res?.el,
          place_before: false,
        };
      }
      return {
        el: above_res?.el,
        place_before: false,
      };
    }
    return {
      el: above_res?.el,
      place_before: true,
    };
  }

  function checkNearbyPosForP(x, y, shift, num_tries) {
    const elementsFromPoint = JR.readerDocument.elementsFromPoint(x, y);
    // Make sure we're not nesting the comment
    if (
      elementsFromPoint.some((el) => el.classList.contains("jr-inline-comment"))
    )
      return;

    const p = elementsFromPoint[0]?.closest("p");
    if (p) return { el: p, y };
    if (num_tries > 1) {
      return checkNearbyPosForP(x, y + shift, shift, --num_tries);
    }
    return;
  }

  const format_content_editable = () =>
    JR.readerDocument.execCommand("formatBlock", false, "p");

  function insertComment({ el, place_before }) {
    const comment_container = JR.readerDocument.createElement("div");
    comment_container.className = "jr-user-content-section";

    const content = JR.readerDocument.createElement("div");
    content.className = "jr-user-content";
    comment_container.appendChild(content);
    bindInlineCommentSection(comment_container);

    if (place_before) {
      el.parentElement.insertBefore(comment_container, el);
    } else {
      el.after(comment_container);
    }

    content.focus();
    format_content_editable();
  }

  JR.readerDocument.addEventListener("click", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    // Make sure it's not just a link being clicked
    function checkForAnchor(el, i) {
      if (!el || i < 0) {
        return false;
      }
      return el.tagName === "A" || checkForAnchor(el.parentElement, --i);
    }
    if (checkForAnchor(e.target, NUM_PARENTS_TO_CHECK_FOR_ANCHOR)) {
      return;
    }

    if (!JR.isPremium) {
      alert(t("commentsPremiumAlert"));
      return;
    }

    const res = findClosestPToClick(e);
    if (res.el) {
      insertComment(res);
    }
  });
}
